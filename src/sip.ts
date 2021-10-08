import * as WebSocket from 'ws';
(global as any).WebSocket = WebSocket
import { Registerer, UserAgent, Invitation } from "sip.js";
import SessionDescriptionHandler from './SessionDescriptionHandler';

const userAgent = new UserAgent({
    uri: UserAgent.makeURI("sip:1000@freeswitch"),
    authorizationUsername: '1000',
    authorizationPassword: 'HelloWorld',
    transportOptions: {
        server: "ws://127.0.0.1:5066",
    },
    sessionDescriptionHandlerFactory: (session, options) => {
        return new SessionDescriptionHandler()
    },
});

let registerer = new Registerer(userAgent);

async function sipReconnect() {
    registerer.dispose()
    setTimeout(async () => {
        try {
            await userAgent.reconnect()
            registerer = new Registerer(userAgent);
            const outgoingRegisterRequest = await registerer.register();
            await new Promise( (resolve, reject) => {
                outgoingRegisterRequest.delegate = {
                    onReject: reject,
                    onAccept: resolve
                }
            })
        } catch(err) {
            console.error(err.message)
            sipReconnect()
        }
    }, 3*1000)
}


export function createUserAgent(onInvite: (invitation: Invitation) => Promise<void>): UserAgent {
    userAgent.delegate = {
        async onInvite(invitation) {
            try {
                await onInvite(invitation)
            } catch(err) {
                console.log('ERROR', err.body)
            }
            
        },
        async onDisconnect(err: Error) {
            if (err) {
                console.log(err.message)
                sipReconnect()
            }
        },
        onConnect() {
            registerer.register().then( () => {
                console.log('user agent registered')
            })
        }
    }
    return userAgent
}