import { PhoneNumberUtil,PhoneNumberFormat as PNF } from 'google-libphonenumber'
const phoneUtil = PhoneNumberUtil.getInstance()

export function formatPhoneNumber(number: string) {
    try {
        const n = phoneUtil.parse(number)
        return phoneUtil.format(n, PNF.INTERNATIONAL)
    } catch(err) {
        console.log(number, err.message)
        return number
    }

}
export function sleep(ms: number) {
    return new Promise( (resolve) => {
        setTimeout(resolve, ms)
    })
}

export default function escapeStringRegexp(string: string) {
	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return string
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d');
}