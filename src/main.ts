import { Invitation } from "sip.js";
import Call from './Call'
import { getIntentInRoom } from "./store";
import { createAppservice, getOrUploadAvatarUrl } from "./appservice";
import { formatPhoneNumber } from './utils';
import { APPSERVICE_CONFIG, COUNTRY_CODE } from './config';
import { createUserAgent } from './sip';


// mapping between Call-IDs and Call instances
const callMapping: {[callId: string]: Call} = {}

/**
 * Called when we recieve an invite from freeswitch
 */
async function onInvite(invitation: Invitation) {
    const matrixId = invitation.request.headers['X-Matrix-Id']?.[0]?.raw
    const callId = invitation.request.callId
    
    // prepend contry code?
    let from = invitation.request.from.displayName
    if(from.startsWith('0') && !from.startsWith('00')) {
        from = COUNTRY_CODE+from.slice(1)
    }
    if(from.startsWith('00')) {
        from = '+'+from.slice(2)
    }

    if(!matrixId) {
        await invitation.reject()
        console.error('got invite, but without any matrixId', {matrixId, callId, from})
        return
    }
    if(!from.slice(1).match(/^[0-9]+/)) {
        await invitation.reject()
        console.error('got invite, but From/Caller-ID seems invalid', {matrixId, callId, from})
        return
    }

    // get or create intent  
    const intent = appservice.getIntentForSuffix(from)
    await intent.ensureRegistered()
    await intent.underlyingClient.setDisplayName(formatPhoneNumber(from));
    await intent.underlyingClient.setAvatarUrl(await getOrUploadAvatarUrl());

    // is there already a room with that number and that matrix ID?
    const rooms = await intent.getJoinedRooms()
    let roomId: string
    for(let r of rooms) {
        const members = await intent.underlyingClient.getJoinedRoomMembers(r)
        console.log(r, {members})
        if(members.includes(matrixId)) {
            roomId = r
            break
        }
    }

    // if not, create one
    if(!roomId) {
        roomId = await intent.underlyingClient.createRoom({
            preset: 'private_chat',
            name: formatPhoneNumber(from),
            is_direct: true,
            invite: [ matrixId ]
        })
    }

    // create call pobject
    const call = new Call(callId, roomId, intent, userAgent)

    // store to match with later matrix events
    callMapping[callId] = call

    // handle Invitation
    call.inviteMatrix(invitation)
}

const userAgent = createUserAgent(onInvite)
const appservice = createAppservice(APPSERVICE_CONFIG)

appservice.on("room.event", async (roomId, event) => {

    // is it a event sent by the appservice?
    if(appservice.getSuffixForUserId(event["sender"])) {
        // ignore
        return
    }

    console.log(`Received event ${event["event_id"]} (${event["type"]}) from ${event["sender"]} in ${roomId}`);
    
    const matrixId = event.sender
    const callId = event.content?.call_id

    // let's find an intent which is able to post in that room
    const intent = await getIntentInRoom(roomId, appservice)
    if(!intent) {
        console.error(`we could not find any way to participate in room ${roomId} after recieving an '${event.tye}' event`)
        return
    }

    let call: Call
    try {
        switch(event["type"]) {

            // Invite to a new call by the matrix user
            case 'm.call.invite':
                const sdp = event.content?.offer?.sdp
                const number = appservice.getSuffixForUserId(intent.userId)
                call = new Call(callId, roomId, intent, userAgent)
                call.handleMatrixInvite(sdp, matrixId, number)
                call.on('close' ,() => {
                    delete callMapping[callId]
                })
                callMapping[callId] = call
                break

            // SDP candidates
            case 'm.call.candidates':
                call = callMapping[callId]
                if(!call) return
                await call.handleCandidates(event)
                break

            // matrix user accepts the out call invite
            case 'm.call.answer':
                call = callMapping[callId]
                if(!call) return
                await call.handleAnswer(event)
                break

            // matrix user hangs up the call
            case 'm.call.hangup':
                call = callMapping[callId]
                if(!call) return
                call.hangup()
                break
            
            case 'm.room.message':
                console.log(`Received message ${event["event_id"]} from ${event["sender"]} in ${roomId}: ${event["content"]["body"]}`);
            }
    } catch(err) {
        console.error(err)
        intent.sendText(roomId, 'Error processing the call:\n'+err.message, 'm.notice')
    }
});
async function main() {
    await userAgent.start()
    console.log('sip connected')

    await appservice.begin()   
    console.log('appservice is up!') 
}

main()