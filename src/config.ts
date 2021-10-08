import * as path from 'path'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { IAppserviceOptions } from 'matrix-bot-sdk';

const config: any = yaml.load(fs.readFileSync(path.join(__dirname, '../config/config.yml'), 'utf8'));
const registration: any = yaml.load(fs.readFileSync(path.join(__dirname, '../config/registration.yml'), 'utf8'));

export const COUNTRY_CODE = config.country_code
export const APPSERVICE_CONFIG: IAppserviceOptions = Object.assign(config.appservice, {
    registration: registration
})

export type IGateway = {[key: string]: string|number|boolean}
export type IUserMapping = {in: string, out: string}
export const GATEWAYS: {[name: string]: IGateway} = config.gateways
export const USER_MAPPING: {[matrixId: string]: IUserMapping} = config.usermapping
