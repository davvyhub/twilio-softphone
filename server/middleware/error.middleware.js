'use strict';

const logger = require('../logger');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
}

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled error', {
    status,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { notFoundHandler, errorHandler };
