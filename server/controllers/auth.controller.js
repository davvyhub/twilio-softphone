'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');
const logger = require('../logger');

// Pre-hash the configured password at startup for fast comparison
let hashedPassword = null;
function getHashedPassword() {
  if (!hashedPassword) {
    hashedPassword = bcrypt.hashSync(config.auth.password, 10);
  }
  return hashedPassword;
}

async function login(req, res) {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const isValid = bcrypt.compareSync(password, getHashedPassword());

    if (!isValid) {
      logger.warn('Failed login attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Invalid password' });
    }

    req.session.authenticated = true;
    req.session.loginTime = new Date().toISOString();

    logger.info('Successful login', { ip: req.ip });
    res.json({ success: true, message: 'Logged in successfully' });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destroy error', { error: err.message });
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    logger.info('User logged out', { ip: req.ip });
    res.json({ success: true, message: 'Logged out successfully' });
  });
}

function status(req, res) {
  res.json({ loggedIn: !!(req.session && req.session.authenticated) });
}

module.exports = { login, logout, status };
