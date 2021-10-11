import type { callIdentifiers } from './types'
import type { SignalingPortal } from './Portal'

export interface bridgeOptions {
    map(callIdentifiers: callIdentifiers, bridge: Bridge): Promise<callIdentifiers>
}

export class Bridge {
    private mapSource: Map<string, callIdentifiers> = new Map()
    private mapDestination: Map<string, callIdentifiers> = new Map()
    private portals: Set<SignalingPortal<any>> = new Set()
    private portalsMetaData: Map<SignalingPortal<any>, any> = new Map()

    constructor(readonly options: bridgeOptions) {

    }
    addPortal(portal: SignalingPortal<any>, metaData?: any) {
        portal.registerEvents({
            // forward invite accept source -> dest
            onInvite: async (callId, sdp, callerId, recipientId) => {
                const source: callIdentifiers = {
                    portal,
                    callerId,
                    recipientId
                }
                // find out where to map the call to
                const dest = await this.options.map(source, this)
                this.mapSource.set(callId, source)
                this.mapDestination.set(callId, dest)
                await dest.portal.sendInvite(callId, sdp, dest.callerId, dest.recipientId)
            },
            
            // forward call accept dest -> source
            onAccept: async (callId, sdp) => {
                const source = this.mapSource.get(callId)
                await source.portal.sendAccept(callId, sdp)
            },

            // forward hangup (both directions)
            onHangup: async (callId, reason) => {
                const source = this.mapSource.get(callId)
                const dest = this.mapDestination.get(callId)
                if(portal === source.portal) {
                    // source -> dest
                    await dest.portal.sendHangup(callId, reason)
                } else {
                    // dest -> source
                    await source.portal.sendHangup(callId, reason)
                }
            }
        }) 
        this.portals.add(portal)
        this.portalsMetaData.set(portal, metaData || {})
    }
    getPortal(filter: (p: SignalingPortal<any>) => boolean): SignalingPortal<any>|null {
        return Array.from(this.portals.values()).find(filter)
    }

    async register() {
        for(let portal of this.portals) {
            await portal.register()
        }
    }
}