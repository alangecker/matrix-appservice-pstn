import { Intent, RoomEvent } from 'matrix-bot-sdk';
import { Inviter, SessionState, UserAgent } from "sip.js";
import { Invitation } from 'sip.js/lib/api/invitation';
import { EventEmitter } from "events";


export default class Call extends EventEmitter {
    private callId: string
    private roomId: string
    private sipUA: UserAgent
    private isCallEstablished = false
    private inviter?: Inviter
    private sipInvitation?: Invitation
    private intent: Intent
    private sdpCandidates: string = ''
    constructor(callId: string, roomId: string, intent: Intent, sipUA: UserAgent) {
        super()
        this.callId = callId
        this.sipUA = sipUA
        this.roomId = roomId
        this.intent = intent
        console.log(`[${this.callId}] created`)
    }

    /**
     * Handle SDP candidates from the matrix user
     */
    async handleCandidates(event: RoomEvent<any>) {
        const candidates  = event.content.candidates
        if(!candidates.length) return
        for(let c of candidates) {
            if(!c.candidate) continue
            this.sdpCandidates += 'a='+c.candidate+'\r\n'
        }
        this.sdpCandidates += 'a=end-of-candidates\r\n'
        
    }
    /**
     * Handle an Invitation by an matrix user
     * It might wait for SDP candidates
     */
    async handleMatrixInvite(sdp: string, matrixId: string, number: string) {
        if(sdp.includes('a=candidate:')) {
            // candidates already included
            await this.inviteSIP(sdp, matrixId, number)
        } else {
            // candidates come later with an m.call.candidates event
            await this.waitForCandidates( () => {
                return this.inviteSIP(sdp, matrixId, number)
            })
        }
    }

    /**
     * wait for an m.call.candidates event event or timeout after 3 seconds
     */
    private async waitForCandidates(cb: Function): Promise<void> {
        return new Promise( (resolve, reject) => {
            const interval = setInterval(() => {
                if(this.sdpCandidates) {
                    clearInterval(interval)
                    const res = cb()
                    if(res instanceof Promise) {
                        res.then(resolve)
                    } else {
                        resolve()
                    }
                }
            }, 100)
    
            // timeout? -> hangup
            setTimeout( () => {
                if(this.sdpCandidates) return
                clearInterval(interval)
                this.hangup()
                reject(new Error('timeout waiting for candidates'))
            }, 3000)
        })

    }
    /**
     * forward the matrix call including the SDP towards freeswitch
     */
    private async inviteSIP(sdp: string, matrixId: string, number: string) {
        if(!this.sipUA.isConnected) {
            this.hangup()
            return
        }
        const target = UserAgent.makeURI("sip:"+number+"@freeswitch");
        this.inviter = new Inviter(this.sipUA, target, {
            extraHeaders: [
                // currently not used by freeswitch, but maybe helpful at some point?
                'X-Matrix-ID: '+matrixId
            ],
            params: {
                // we use the display name in freeswitch's dialplan
                fromDisplayName: matrixId
            },
            sessionDescriptionHandlerOptions: {
                constraints: { 
                    offerSdp: sdp+this.sdpCandidates,
                    onResponse: this.onSipInviteResponse
                }
            },
        });
        this.inviter.delegate = {
            onBye: (bye) => {
                this.hangup(null, true)
            },
        }
        await this.inviter.invite({
            requestDelegate: {
                onReject: ({message}) => {
                    if(message.statusCode === 486) {
                        // 486 Busy Here
                        this.hangup()
                    } else if(message.statusCode === 408) {
                        // 408 Request Timeout
                        this.hangup('invite_timeout')
                    } else if(message.statusCode >= 500) {
                        // 503 Service Unavailable
                        this.hangup('ice_failed')
                    } else {
                        console.log(message.data)
                        this.hangup()
                    }
                },
            }
        })
        console.log('invited')
    }
    
    /**
     * SIP user accepted the call, let's return that to
     * the matrix user
     */
    private onSipInviteResponse = (sdp: string) => {
        const content = {
            answer: {
                sdp,
                type: 'answer'
            },
            capabilities: {
                "m.call.transferee": false,
                "m.call.dtmf": false // TODO: handle DTMF
            },
            call_id: this.callId,
            // party_id: client.deviceId,
            version: 1
        }
        this.sendMatrixEvent("m.call.answer", content)
        this.isCallEstablished = true
    }

    /**
     * Forwards an invite from SIP towards the Matrix User
     */
    inviteMatrix(sipInvitation: Invitation) {   
        this.sipInvitation = sipInvitation
        this.sipInvitation.delegate = {
            onBye: () => this.hangup(null, true)
        }
        const sdp = sipInvitation.body
        this.sendMatrixEvent("m.call.invite", {
            lifetime: 60000,
            offer: {
                type: "offer",
                sdp
            },
            capabilities: {
                "m.call.transferee": false,
                "m.call.dtmf": false // TODO: handle DTMF
            },
            "version": 1,
            "call_id": this.callId,
            // "party_id": client.deviceId
        })
    }

    /**
     * Forwards an matrix call accept event (m.call.answer) to SIP
     */
    async handleAnswer(event:  RoomEvent<any>) {
        const callId  = event.content?.call_id
        const sdp: string  = event.content?.answer?.sdp
        if(!sdp || !callId) return

        const accept = async () => {
            await this.sipInvitation.accept({
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        offerSdp: sdp+this.sdpCandidates,
                        onResponse(res) {
                            console.log(res)
                        }
                    },
                }
            })
            this.isCallEstablished = true
        }
        if(sdp.includes('a=candidate:')) {
            await accept()
        } else {
            await this.waitForCandidates(accept)
        }
    }

    /**
     * send an event into the related matrix room
     */
    private sendMatrixEvent(type: string, content: any) {
        this.intent.underlyingClient.sendEvent(this.roomId, type, content)
    }

    /**
     * hangup the current call and clean up references
     */
    hangup(reason?: "ice_failed"|"invite_timeout", bySIP: boolean = false) {
        if(!bySIP && this.inviter) {
            switch(this.inviter.state) {
                case SessionState.Initial:
                case SessionState.Establishing:
                    this.inviter.cancel()
                    break
                case SessionState.Established:
                    this.inviter.bye()     
                    break    
            }
        }
        if(!bySIP && this.sipInvitation) {
            if(this.sipInvitation.state == SessionState.Established) {
                this.sipInvitation.bye()
            }
        }
        const type = this.isCallEstablished ? "m.call.hangup" : "m.call.reject"
        const content = {
            call_id: this.callId,
            // party_id: client.deviceId,
            version: 1,
            reason 
        }
        
        this.sendMatrixEvent(type, content)

        // clean up
        this.inviter = null
        this.sipUA = null
        this.sipInvitation = null
        this.emit('close')
    }
}
