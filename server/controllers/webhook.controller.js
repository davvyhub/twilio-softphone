'use strict';

const { buildOutboundTwiml, buildInboundTwiml, buildFallbackTwiml } = require('../services/twiml.service');
const { upsertCall } = require('../services/call-log.service');
const { normalizePhoneNumber, isValidPhoneNumber } = require('../services/twilio.service');
const logger = require('../logger');

/**
 * POST /webhook/voice
 * Called by Twilio for both inbound and outbound calls.
 * If 'To' param is present and looks like a phone number → outbound.
 * Otherwise → inbound (route to browser client).
 */
function voiceWebhook(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  try {
    const to = req.body.To || '';
    const from = req.body.From || '';
    const callSid = req.body.CallSid || '';

    logger.info('Voice webhook received', { to, from, callSid });

    // Outbound: To is a phone number (not a client identity)
    if (to && to.startsWith('+')) {
      const normalizedTo = normalizePhoneNumber(to);
      if (!isValidPhoneNumber(normalizedTo)) {
        logger.warn('Invalid outbound number', { to, normalizedTo });
        return res.send(buildFallbackTwiml('The number you dialed is invalid. Please check and try again.'));
      }
      return res.send(buildOutboundTwiml(normalizedTo));
    }

    // Inbound: route to browser client
    return res.send(buildInboundTwiml());
  } catch (err) {
    logger.error('Voice webhook error', { error: err.message, stack: err.stack });
    res.send(buildFallbackTwiml('An error occurred. Please try again.'));
  }
}

/**
 * POST /webhook/status
 * Called by Twilio on every call status change.
 * Must respond quickly — async DB write is synchronous (better-sqlite3).
 */
function statusWebhook(req, res) {
  // Respond immediately to Twilio
  res.status(200).send('');

  try {
    const { CallSid, CallStatus } = req.body;
    logger.info('Status webhook received', { CallSid, CallStatus, direction: req.body.Direction });
    upsertCall(req.body);
  } catch (err) {
    // Log but don't crash — we already responded 200 to Twilio
    logger.error('Status webhook processing error', { error: err.message, body: req.body });
  }
}

/**
 * POST /webhook/fallback
 * Called by Twilio when the primary webhook fails.
 */
function fallbackWebhook(req, res) {
  res.setHeader('Content-Type', 'text/xml');
  logger.error('Twilio fallback webhook triggered', { body: req.body });
  res.send(buildFallbackTwiml('We are sorry, there was a problem connecting your call.'));
}

module.exports = { voiceWebhook, statusWebhook, fallbackWebhook };
