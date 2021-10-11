import { SignalingPortal } from './libs/signaling-bridge/Portal'
import { IAppserviceOptions } from 'matrix-bot-sdk';


export interface MatrixPortalOptions {
    appservice: IAppserviceOptions
}
export class MatrixPortal implements SignalingPortal<MatrixPortalOptions> {
    // to be implemented
    constructor(readonly options: MatrixPortalOptions) {}
    async register(): Promise<void> { throw new Error('not implemented yet') }
    async sendInvite(callId: string, sdp: string, callerId: string, recipientId: string) { throw new Error('not implemented yet') }
    async sendAccept(callId: string, sdp: string) { throw new Error('not implemented yet') }
    async sendHangup(callId: string, reason?: string) { throw new Error('not implemented yet') }
    registerEvents(handlers: any)  { throw new Error('not implemented yet'); }
}
