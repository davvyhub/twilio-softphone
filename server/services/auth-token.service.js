'use strict';

/**
 * Stateless HMAC-based auth token.
 * Token = base64(timestamp) + '.' + HMAC-SHA256(secret, timestamp)
 * No database, no sessions, no cookies. Works across restarts.
 * Token expires after 24 hours.
 */

const crypto = require('crypto');
const config = require('../config');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function createToken() {
  const timestamp = Date.now();
  const payload = timestamp.toString();
  const hmac = crypto
    .createHmac('sha256', config.server.sessionSecret)
    .update(payload)
    .digest('hex');
  return `${Buffer.from(payload).toString('base64')}.${hmac}`;
}

function validateToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  let timestamp;
  try {
    timestamp = parseInt(Buffer.from(parts[0], 'base64').toString(), 10);
  } catch {
    return false;
  }

  if (isNaN(timestamp)) return false;
  if (Date.now() - timestamp > TOKEN_TTL_MS) return false;

  const expectedHmac = crypto
    .createHmac('sha256', config.server.sessionSecret)
    .update(timestamp.toString())
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(parts[1], 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  } catch {
    return false;
  }
}

module.exports = { createToken, validateToken };
