'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  listCalls,
  getCallStats,
  getCall,
  updateCallNotes,
  deleteCall,
} = require('../controllers/calls.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', listCalls);
router.get('/stats', getCallStats);
router.get('/:id', getCall);
router.patch('/:id/notes', updateCallNotes);
router.delete('/:id', deleteCall);

module.exports = router;
