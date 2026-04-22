'use strict';

const { getDashboardData } = require('../services/call-log.service');
const logger = require('../logger');

function getDashboard(req, res) {
  try {
    const data = getDashboardData();
    res.json(data);
  } catch (err) {
    logger.error('getDashboard error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
}

module.exports = { getDashboard };
