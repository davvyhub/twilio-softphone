'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');
const logger = require('../logger');
const { createToken, validateToken } = require('../services/auth-token.service');

let hashedPassword = null;
function getHashedPassword() {
  if (!hashedPassword) {
    hashedPassword = bcrypt.hashSync(config.auth.password, 10);
  }
  return hashedPassword;
}

function login(req, res) {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const isValid = bcrypt.compareSync(password, getHashedPassword());

  if (!isValid) {
    logger.warn('Failed login attempt', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = createToken();
  logger.info('Successful login', { ip: req.ip });
  res.json({ success: true, token });
}

function logout(_req, res) {
  // Token is stateless — client just discards it
  res.json({ success: true, message: 'Logged out' });
}

function status(req, res) {
  const token = extractToken(req);
  res.json({ loggedIn: validateToken(token) });
}

function extractToken(req) {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

module.exports = { login, logout, status, extractToken };
