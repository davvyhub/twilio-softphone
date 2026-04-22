'use strict';

const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const config = require('../config');
const logger = require('../logger');

const TOKEN_TTL_SECONDS = 3600; // 1 hour

/**
 * Generate a Twilio Access Token for the Voice JS SDK.
 * The token grants the client identity 'agent' access to make/receive calls
 * via the configured TwiML App.
 */
function generateVoiceToken() {
  try {
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: config.twilio.twimlAppSid,
      incomingAllow: true,
    });

    const token = new AccessToken(
      config.twilio.accountSid,
      config.twilio.apiKey,
      config.twilio.apiSecret,
      {
        identity: config.twilio.clientIdentity,
        ttl: TOKEN_TTL_SECONDS,
      }
    );

    token.addGrant(voiceGrant);

    const jwt = token.toJwt();
    logger.info('Generated Voice access token', { identity: config.twilio.clientIdentity, ttl: TOKEN_TTL_SECONDS });

    return { token: jwt, ttl: TOKEN_TTL_SECONDS, identity: config.twilio.clientIdentity };
  } catch (err) {
    logger.error('Failed to generate Voice access token', { error: err.message });
    throw err;
  }
}

module.exports = { generateVoiceToken };
