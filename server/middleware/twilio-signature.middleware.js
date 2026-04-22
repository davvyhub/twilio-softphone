'use strict';

const twilio = require('twilio');
const config = require('../config');
const logger = require('../logger');

function validateTwilioSignature(req, res, next) {
  // In development without a real PUBLIC_URL, skip validation
  if (config.server.nodeEnv === 'development' && config.app.publicUrl.includes('localhost')) {
    logger.warn('Skipping Twilio signature validation in development (localhost PUBLIC_URL)');
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'];
  if (!twilioSignature) {
    logger.warn('Missing X-Twilio-Signature header', { path: req.path, ip: req.ip });
    return res.status(403).send('Forbidden: Missing Twilio signature');
  }

  const url = `${config.app.publicUrl}${req.originalUrl}`;
  const params = req.body || {};

  const isValid = twilio.validateRequest(
    config.twilio.authToken,
    twilioSignature,
    url,
    params
  );

  if (!isValid) {
    logger.warn('Invalid Twilio signature', { path: req.path, ip: req.ip, url });
    return res.status(403).send('Forbidden: Invalid Twilio signature');
  }

  next();
}

module.exports = { validateTwilioSignature };
