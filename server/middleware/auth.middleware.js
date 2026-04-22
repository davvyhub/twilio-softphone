'use strict';

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated === true) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
}

module.exports = { requireAuth };
