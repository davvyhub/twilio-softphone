'use strict';

const { extractToken } = require('../controllers/auth.controller');
const { validateToken } = require('../services/auth-token.service');

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (validateToken(token)) return next();
  res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
}

module.exports = { requireAuth };
