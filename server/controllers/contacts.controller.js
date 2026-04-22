'use strict';

const { getDb } = require('../db/database');
const { normalizePhoneNumber, isValidPhoneNumber } = require('../services/twilio.service');
const logger = require('../logger');

function listContacts(req, res) {
  try {
    const db = getDb();
    const search = (req.query.search || '').trim().slice(0, 100);

    let rows;
    if (search) {
      const s = `%${search}%`;
      rows = db.prepare(`
        SELECT * FROM contacts
        WHERE name LIKE ? OR phone LIKE ? OR company LIKE ? OR email LIKE ?
        ORDER BY name ASC
      `).all(s, s, s, s);
    } else {
      rows = db.prepare('SELECT * FROM contacts ORDER BY name ASC').all();
    }

    res.json({ contacts: rows, total: rows.length });
  } catch (err) {
    logger.error('listContacts error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
}

function createContact(req, res) {
  try {
    const db = getDb();
    const { name, phone, email, company, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const existing = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(normalizedPhone);
    if (existing) {
      return res.status(409).json({ error: 'A contact with this phone number already exists' });
    }

    const result = db.prepare(`
      INSERT INTO contacts (name, phone, email, company, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      name.trim().slice(0, 100),
      normalizedPhone,
      (email || '').trim().slice(0, 200),
      (company || '').trim().slice(0, 100),
      (notes || '').trim().slice(0, 1000)
    );

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
    logger.info('Contact created', { id: result.lastInsertRowid, phone: normalizedPhone });
    res.status(201).json(contact);
  } catch (err) {
    logger.error('createContact error', { error: err.message });
    res.status(500).json({ error: 'Failed to create contact' });
  }
}

function getContact(req, res) {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid contact ID' });

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    res.json(contact);
  } catch (err) {
    logger.error('getContact error', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve contact' });
  }
}

function updateContact(req, res) {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid contact ID' });

    const { name, phone, email, company, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check for phone conflict with another contact
    const conflict = db.prepare('SELECT id FROM contacts WHERE phone = ? AND id != ?').get(normalizedPhone, id);
    if (conflict) {
      return res.status(409).json({ error: 'Another contact already has this phone number' });
    }

    const result = db.prepare(`
      UPDATE contacts
      SET name = ?, phone = ?, email = ?, company = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name.trim().slice(0, 100),
      normalizedPhone,
      (email || '').trim().slice(0, 200),
      (company || '').trim().slice(0, 100),
      (notes || '').trim().slice(0, 1000),
      id
    );

    if (result.changes === 0) return res.status(404).json({ error: 'Contact not found' });

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    res.json(contact);
  } catch (err) {
    logger.error('updateContact error', { error: err.message });
    res.status(500).json({ error: 'Failed to update contact' });
  }
}

function deleteContact(req, res) {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid contact ID' });

    const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Contact not found' });

    logger.info('Contact deleted', { id });
    res.json({ success: true });
  } catch (err) {
    logger.error('deleteContact error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete contact' });
  }
}

function lookupContactByPhone(req, res) {
  try {
    const db = getDb();
    const rawPhone = req.params.phone;
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    const contact = db.prepare('SELECT * FROM contacts WHERE phone = ?').get(normalizedPhone);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    res.json(contact);
  } catch (err) {
    logger.error('lookupContactByPhone error', { error: err.message });
    res.status(500).json({ error: 'Failed to look up contact' });
  }
}

module.exports = {
  listContacts,
  createContact,
  getContact,
  updateContact,
  deleteContact,
  lookupContactByPhone,
};
