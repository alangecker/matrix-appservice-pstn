import { Bridge } from './libs/signaling-bridge/Bridge'
import { SIPPortal } from './SIPPortal';
import { MatrixPortal } from './MatrixPortal';

const sipToMatrixMapping: Map<SIPPortal, string> = new Map()
const matrixToSipMapping: Map<string, SIPPortal> = new Map()

const bridge = new Bridge({

    // maps a call from a specified source to its destination
    async map(source, bridge) {
        if(source.portal instanceof MatrixPortal) {
            // Matrix -> SIP
            const destinationPortal = matrixToSipMapping.get(source.callerId)
            if(!destinationPortal) return null
            const number = getNumberFromMatrixPuppetId(source.recipientId)
            return {
                portal: destinationPortal,
                callerId:  source.callerId,
                recipientId: number
            }
        } else if(source.portal instanceof SIPPortal) {
            // SIP -> Matrix
            const destinationPortal = bridge.getPortal(p => p instanceof MatrixPortal)
            const callerId = getMatrixPuppetIdForNumber(source.callerId)
            const recipentId = sipToMatrixMapping.get(source.portal)
            return {
                portal: destinationPortal,
                callerId: callerId,
                recipientId: recipentId
            }
        } else {
            return null
        }
    }
})

const matrix = new MatrixPortal({ appservice: null })
const sip1 = new SIPPortal({ isInbound: true, isOutbound: false, server: 'sips.peoplefone.de', username: 'test' })
const sip2 = new SIPPortal({ isInbound: false, isOutbound: true , server: 'sip.callingcredit.com', username: 'test' })
bridge.addPortal(matrix)
bridge.addPortal(sip1)
bridge.addPortal(sip2)
sipToMatrixMapping.set(sip1, '@test:localhost')
matrixToSipMapping.set('@test:localhost', sip2)

bridge.register()