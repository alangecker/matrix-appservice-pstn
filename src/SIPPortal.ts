
import { SignalingPortal } from './libs/signaling-bridge/Portal'

export interface SIPPortalOptions {
    isInbound: boolean
    isOutbound: boolean
    server: string
    port?: number
    username: string
    password?: string
}
export class SIPPortal implements SignalingPortal<SIPPortalOptions> {
    // To be implemented
    constructor(readonly options: SIPPortalOptions) {}
    async register(): Promise<void> { throw new Error('not implemented yet') }
    async sendInvite(callId: string, sdp: string, callerId: string, recipientId: string) { throw new Error('not implemented yet') }
    async sendAccept(callId: string, sdp: string) { throw new Error('not implemented yet') }
    async sendHangup(callId: string, reason?: string) { throw new Error('not implemented yet') }
    registerEvents(handlers: any)  { throw new Error('not implemented yet'); }
}
