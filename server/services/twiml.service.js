'use strict';

const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const config = require('../config');
const logger = require('../logger');

/**
 * Build TwiML for an outbound call.
 * The browser passes the destination number as the 'To' param.
 */
function buildOutboundTwiml(toNumber) {
  const response = new VoiceResponse();
  const dial = response.dial({
    callerId: config.twilio.phoneNumber,
    record: 'do-not-record',
    timeout: 30,
  });
  dial.number(toNumber);
  logger.debug('Built outbound TwiML', { to: toNumber, callerId: config.twilio.phoneNumber });
  return response.toString();
}

/**
 * Build TwiML for an inbound call — route to the browser client.
 */
function buildInboundTwiml() {
  const response = new VoiceResponse();
  const dial = response.dial({
    timeout: 30,
    record: 'do-not-record',
  });
  dial.client(config.twilio.clientIdentity);
  logger.debug('Built inbound TwiML', { clientIdentity: config.twilio.clientIdentity });
  return response.toString();
}

/**
 * Build TwiML for fallback/error scenarios.
 */
function buildFallbackTwiml(message) {
  const response = new VoiceResponse();
  response.say({ voice: 'alice', language: 'en-US' }, message || 'We are sorry, an error has occurred. Please try again later.');
  response.hangup();
  return response.toString();
}

module.exports = { buildOutboundTwiml, buildInboundTwiml, buildFallbackTwiml };
