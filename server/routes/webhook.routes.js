'use strict';

const express = require('express');
const { validateTwilioSignature } = require('../middleware/twilio-signature.middleware');
const { voiceWebhook, statusWebhook, fallbackWebhook } = require('../controllers/webhook.controller');

const router = express.Router();

// Twilio webhooks use application/x-www-form-urlencoded
// Signature validation reads from req.body, so express.urlencoded must be applied before this router
router.post('/voice', validateTwilioSignature, voiceWebhook);
router.post('/status', validateTwilioSignature, statusWebhook);
router.post('/fallback', validateTwilioSignature, fallbackWebhook);

module.exports = router;
