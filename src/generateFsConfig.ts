import { GATEWAYS, USER_MAPPING } from "./config";
import { toXML } from "jstoxml";
import * as path from 'path'
import * as fs from 'fs'
import escapeStringRegexp from "./utils";

let inboundGateways: {[name: string]: string} = {}
for(let matrixId in USER_MAPPING) {
    const m = USER_MAPPING[matrixId]
    if(!GATEWAYS[m.in]) {
        console.error(`Inbound gateway '${m.in}' for ${matrixId} is not specified.`)
        process.exit(1)
    }
    if(!GATEWAYS[m.out]) {
        console.error(`Outbound gateway '${m.out}' for ${matrixId} is not specified.`)
        process.exit(1)
    }
    if(inboundGateways[m.in]) {
        console.error(`Gateway ${m.in} is already used as a inbound gateway for ${inboundGateways[m.in]}. We can't reuse it for ${matrixId}`)
        process.exit(1)
    }
    inboundGateways[m.in] = matrixId
}
const xmlOptions = {
    indent: "  ",
};
function objToElement(name: string, attrs: any) {
    return {
        _name: name,
        _attrs: attrs
    }
}

const gatewaysXML = toXML({
    include: Object.keys(GATEWAYS).map(name => {
        const g = GATEWAYS[name]
        g.register = inboundGateways[name] ? 'true' : 'false'
        let content = []
        for(let key in g) {
            const value = g[key]
            content.push(objToElement('param', { name: key, value }))
        }
        if(inboundGateways[name]) {
            content.push({
                _name: 'variables',
                _content: [
                    objToElement('variable', {
                        name: "matrix_id",
                        value: inboundGateways[name],
                        direction: 'inbound'
                    })
                ]
            })
        }
        return {
            _name: 'gateway',
            _attrs: {
                name: name
            },
            _content: content
        }
    })
  }, xmlOptions);

console.log(gatewaysXML)
fs.writeFileSync(path.join(__dirname, '../freeswitch/config/sip_profiles/external/appservice.xml'), gatewaysXML, 'utf-8')
const dialplanXML = toXML({
    include: {
        _name: 'extension',
        _attrs: {
            name: 'matrix_to_sip',
        },
        _content: [
            Object.keys(USER_MAPPING).map(matrixId => {
                const u = USER_MAPPING[matrixId]
                return {
                    _name: 'condition',
                    _attrs: {
                        field: 'caller_id_name',
                        expression: '^'+escapeStringRegexp(matrixId)+'$', // TODO escape
                        break: 'on-true'
                    },
                    _content: [
                        objToElement('action', { application: 'info' }),
                        objToElement('action', { application: 'set', 'data': 'origination_privacy=hide_name:hide_number:screen' }),
                        objToElement('action', { application: 'set', 'data': 'sip_copy_custom_headers=false' }),
                        objToElement('action', { application: 'bridge', 'data': 'sofia/gateway/'+u.out+'/${sip_to_user}' }),
                    ]
                }
            })
        ]
    }
  }, xmlOptions);

console.log(dialplanXML)
fs.writeFileSync(path.join(__dirname, '../freeswitch/config/dialplan/default/appservice.xml'), dialplanXML, 'utf-8')

