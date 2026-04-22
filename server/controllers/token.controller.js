'use strict';

const { generateVoiceToken } = require('../services/token.service');
const logger = require('../logger');

function getToken(req, res) {
  try {
    const tokenData = generateVoiceToken();
    res.json(tokenData);
  } catch (err) {
    logger.error('Token generation failed', { error: err.message });
    res.status(500).json({ error: 'Failed to generate access token' });
  }
}

module.exports = { getToken };
