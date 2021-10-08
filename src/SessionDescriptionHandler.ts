import { SessionDescriptionHandler as SessionDescriptionHandlerDefinition } from "sip.js/lib/api";

/**
 * Mocking SessionDescriptionHandler
 * forwards the SDP provided to sip.js
 */
export default class SessionDescriptionHandler implements SessionDescriptionHandlerDefinition {
    async getDescription(options, modifiers) {
      return {
        body: options.constraints.offerSdp,
        contentType: "application/sdp"
      }
    }
    async setDescription(sessionDescription, options, modifiers) {
      options.constraints.onResponse(sessionDescription)
    }
    hasDescription(contentType) {
      if(contentType == 'application/sdp') {
        return true
      } else {
        return false
      }
    }
    async holdModifier(description) {
      return null
    }
    sendDtmf(tones, options) {
      return true
    }
    close() {
    }
  }
  