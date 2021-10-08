
import { Appservice, AutojoinRoomsMixin, IAppserviceOptions }  from "matrix-bot-sdk";
import * as fs from 'fs'
import { formatPhoneNumber } from "./utils";
import { getAvatarMxc, storeAvatarMxc, storeIntent } from "./store";
import { COUNTRY_CODE } from "./config";

let appservice: Appservice

function numberToMatrixId(number: string): string {
    number = number.replace(/[\-\s]+/g, '')
    if(number.startsWith('00')) number = '+'+number.slice(2)
    else if(number.startsWith('0')) number = COUNTRY_CODE + number.slice(1)
    return appservice.getUserIdForSuffix(number)
}


export async function getOrUploadAvatarUrl(): Promise<string> {
    let url = await getAvatarMxc(appservice)
    if(!url) {
        url = await appservice.botClient.uploadContent(fs.readFileSync('phone.png'), 'image/png', 'phone.png')
        await storeAvatarMxc(url, appservice)
    }
    return url
}

export function createAppservice(options: IAppserviceOptions): Appservice {
        
    appservice = new Appservice(options);

    // auto join on room invites
    AutojoinRoomsMixin.setupOnAppservice(appservice);

    // add missing API routes
    appservice.expressAppInstance.get("/_matrix/app/unstable/thirdparty/protocol/:protocol", (req, res) => {
        res.status(200).json({
            user_fields: [],
            location_fields: [],
            icon: '',
            field_types: {},
            instances: []
        });
    })
    appservice.expressAppInstance.get("/_matrix/app/unstable/thirdparty/user/:protocol", (req, res) => {
        // allow unauthenticated requests
        req.query["access_token"] = options.registration.hs_token

        return (appservice as any).handleThirdpartyObject(req, res, "user", req.query["userid"] as string);
    });

    appservice.on('thirdparty.user.remote', async (protocol, fields, cb) => {
        console.log(`Received ${protocol} remote query`, fields);
        switch(protocol) {
            case 'm.protocol.pstn':
                let number: string = fields['m.id.phone']
                if(!number) return cb()
                const userid = numberToMatrixId(number)
                await storeIntent(appservice, userid)
                cb([
                    {
                        userid: userid,
                        protocol: 'm.protocol.pstn',
                        fields: {}
                    }
                ])
                break
            
            case 'im.vector.protocol.sip_native':
                cb([
                    {
                        userid: fields['virtual_mxid'],
                        protocol: 'im.vector.protocol.sip_native',
                        fields: {
                            lookup_success: true,
                            is_virtual: true
                        }
                    }
                ])
                break

            case 'im.vector.protocol.sip_virtual':
                cb([
                    {
                        userid: fields['native_mxid'],
                        protocol: 'im.vector.protocol.sip_virtual',
                        fields: {
                            lookup_success: true
                        }
                    }
                ])
                break

            default:
                cb()
        }    
    })
    appservice.on("query.user", async (userId, createUser) => {
        // This is called when the homeserver queries a user's existence. At this point, a
        // user should be created. To do that, give an object or Promise of an object in the
        // form below to the createUser function (as shown). To prevent the creation of a user,
        // pass false to createUser, like so: createUser(false);
    
        console.log(`Received query for user ${userId}`);
        const suffix = appservice.getSuffixForUserId(userId)
        if(!suffix) return createUser(false)    
        await storeIntent(appservice, userId)
        createUser({
            display_name: formatPhoneNumber(suffix),
            avatar_mxc: await getOrUploadAvatarUrl(),
        });
    });

    appservice.on("query.room", (roomAlias, createRoom) => {
        createRoom(false);
    });

    appservice.on("room.invite", (roomId, inviteEvent) => {
        console.log(`Received invite for ${inviteEvent["state_key"]} to ${roomId}`);
        storeIntent(appservice, inviteEvent["state_key"])
    });

    appservice.on("room.join", (roomId, joinEvent) => {
        console.log(`Joined ${roomId} as ${joinEvent["state_key"]}`);
        storeIntent(appservice, joinEvent["state_key"])
    });

    appservice.on("room.leave", (roomId, leaveEvent) => {
        console.log(`Left ${roomId} as ${leaveEvent["state_key"]}`);
    });

    return appservice   
}