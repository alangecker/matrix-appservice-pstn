import type { SignalingPortal } from './Portal'

export interface callIdentifiers {
    portal: SignalingPortal<any>
    callerId: string
    recipientId: string
}

