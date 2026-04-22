'use strict';

const callLogService = require('../services/call-log.service');
const logger = require('../logger');

function listCalls(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = ['all', 'missed', 'inbound', 'outbound'].includes(req.query.filter)
      ? req.query.filter
      : 'all';
    const search = (req.query.search || '').trim().slice(0, 100);

    const result = callLogService.getCalls({ page, limit, filter, search });
    res.json(result);
  } catch (err) {
    logger.error('listCalls error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve calls' });
  }
}

function getCallStats(req, res) {
  try {
    const stats = callLogService.getCallStats();
    res.json(stats);
  } catch (err) {
    logger.error('getCallStats error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve call statistics' });
  }
}

function getCall(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid call ID' });

    const call = callLogService.getCallById(id);
    if (!call) return res.status(404).json({ error: 'Call not found' });

    res.json(call);
  } catch (err) {
    logger.error('getCall error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve call' });
  }
}

function updateCallNotes(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid call ID' });

    const { notes } = req.body;
    if (typeof notes !== 'string') return res.status(400).json({ error: 'notes must be a string' });

    const updated = callLogService.updateCallNotes(id, notes.slice(0, 2000));
    if (!updated) return res.status(404).json({ error: 'Call not found' });

    res.json({ success: true });
  } catch (err) {
    logger.error('updateCallNotes error', { error: err.message });
    res.status(500).json({ error: 'Failed to update notes' });
  }
}

function deleteCall(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid call ID' });

    const deleted = callLogService.deleteCall(id);
    if (!deleted) return res.status(404).json({ error: 'Call not found' });

    res.json({ success: true });
  } catch (err) {
    logger.error('deleteCall error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete call' });
  }
}

module.exports = { listCalls, getCallStats, getCall, updateCallNotes, deleteCall };
