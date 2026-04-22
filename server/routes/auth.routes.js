'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, logout, status } = require('../controllers/auth.controller');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/status', status);

module.exports = router;
