'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getToken } = require('../controllers/token.controller');

const router = express.Router();

router.get('/', requireAuth, getToken);

module.exports = router;
