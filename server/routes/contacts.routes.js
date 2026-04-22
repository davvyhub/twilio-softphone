'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  listContacts,
  createContact,
  getContact,
  updateContact,
  deleteContact,
  lookupContactByPhone,
} = require('../controllers/contacts.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', listContacts);
router.post('/', createContact);
router.get('/lookup/:phone', lookupContactByPhone);
router.get('/:id', getContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
