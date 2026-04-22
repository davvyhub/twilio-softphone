'use strict';

const twilio = require('twilio');
const config = require('../config');
const logger = require('../logger');

let client;

function getTwilioClient() {
  if (!client) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
}

/**
 * Normalize a phone number to E.164 format.
 * Handles US/Canada 10-digit numbers (adds +1) and already-formatted numbers.
 */
function normalizePhoneNumber(raw) {
  if (!raw) return '';

  // Strip all non-digit characters except leading +
  let cleaned = raw.replace(/[^\d+]/g, '');

  // Already E.164 with country code
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // 10-digit US/Canada number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // 11-digit starting with 1 (US/Canada with country code, no +)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Return as-is if we can't determine the format (let Twilio validate)
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Validate that a number looks like a valid E.164 phone number.
 */
function isValidPhoneNumber(number) {
  return /^\+[1-9]\d{7,14}$/.test(number);
}

module.exports = { getTwilioClient, normalizePhoneNumber, isValidPhoneNumber };
