/**
 * Interface with gets implemented once for Matrix and once for SIP
 */
export declare interface SignalingPortal<portalOptions> {
    readonly options: portalOptions,
    // constructor(options: portalOptions): any
    register(): Promise<void>
    sendInvite(callId: string, sdp: string, callerId: string, recipientId: string): Promise<void>
    sendAccept(callId: string, sdp: string): Promise<void>
    sendHangup(callId: string, reason?: string): Promise<void>
    // sendDTMF(callId: string, code: string): Promise<void>
    // sendMessage(callerId: string, recipientId: string, body: string): Promise<void>
    registerEvents(handlers: {
        onInvite: (callId: string, sdp: string, callerId: string, recipientId: string) => Promise<void>,
        onAccept: (callId: string, sdp: string) => Promise<void>,
        onHangup: (callId: string, reason?: string) => Promise<void>,
        // onDTMF: (callId: string, code: string) => Promise<void>,
        // onMessage: (callerId: string, recipientId: string, body: string) => Promise<void>,
    }): void
}


