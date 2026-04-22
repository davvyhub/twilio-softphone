'use strict';

require('dotenv').config();

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

const config = {
  server: {
    port: parseInt(optional('PORT', '3000'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
    sessionSecret: required('SESSION_SECRET'),
    isProduction: optional('NODE_ENV', 'development') === 'production',
  },

  auth: {
    password: required('APP_PASSWORD'),
  },

  twilio: {
    accountSid: required('TWILIO_ACCOUNT_SID'),
    authToken: required('TWILIO_AUTH_TOKEN'),
    apiKey: required('TWILIO_API_KEY'),
    apiSecret: required('TWILIO_API_SECRET'),
    twimlAppSid: required('TWILIO_TWIML_APP_SID'),
    phoneNumber: required('TWILIO_PHONE_NUMBER'),
    clientIdentity: optional('TWILIO_CLIENT_IDENTITY', 'agent'),
  },

  app: {
    publicUrl: required('PUBLIC_URL'),
  },

  db: {
    path: optional('DB_PATH', './database/softphone.db'),
  },
};

module.exports = config;
