import { Appservice, Intent } from "matrix-bot-sdk";

const ACCOUNT_DATA_EVENT_TYPE = 'com.github.alangecker.matrix-appservice-pstn'

let knownIndents: string[] = []
let isLoaded = false
let avatarUrl = null

async function save(appservice: Appservice): Promise<void>  {
    await appservice.botClient.setAccountData(ACCOUNT_DATA_EVENT_TYPE, { 
        knownIndents,
        avatarUrl
    })
}
async function load(appservice: Appservice): Promise<void> {
    try {
        const res: {knownIndents: string[], avatarUrl: string} = await appservice.botClient.getAccountData(ACCOUNT_DATA_EVENT_TYPE)
        knownIndents = res.knownIndents
        avatarUrl = res.avatarUrl
        console.log('loaded list of known intents', knownIndents)
    }catch(err) {
        if(err.body?.errcode !== 'M_NOT_FOUND')  {
            throw err
        }
    }
    isLoaded = true
}

export async function storeIntent(appservice: Appservice, intent: string) {
    if(!isLoaded) {
        await load(appservice)
    }
    if(!knownIndents.includes(intent)) {
        knownIndents.push(intent)
        await save(appservice)
    }
}

export async function getIntentList(appservice: Appservice): Promise<string[]> {
    if(!isLoaded) {
        await load(appservice)
    }
    return knownIndents
}

export async function getIntentInRoom(roomId: string, appservice: Appservice): Promise<Intent|null> {
    const knownUserIds = await getIntentList(appservice)
    for(let userId of knownUserIds) {
        try {
            const intent = appservice.getIntentForUserId(userId)
            const rooms = await intent.getJoinedRooms()
            if(rooms.includes(roomId)) return intent
        } catch(err) {
            // ignore user
        }
    }
    return null
}

export async function storeAvatarMxc(url: string, appservice: Appservice) {
    if(!isLoaded) {
        await load(appservice)
    }
    avatarUrl = url
    await save(appservice)
}
export async function getAvatarMxc(appservice: Appservice) {
    if(!isLoaded) {
        await load(appservice)
    }
    return avatarUrl
}