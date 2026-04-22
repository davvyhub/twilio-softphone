'use strict';

const { getDb } = require('../db/database');
const logger = require('../logger');

const MISSED_STATUSES = ['no-answer', 'busy', 'failed', 'canceled'];

/**
 * Look up a contact name by phone number.
 */
function lookupContactName(phone) {
  if (!phone) return null;
  const db = getDb();
  const row = db.prepare('SELECT name FROM contacts WHERE phone = ?').get(phone);
  return row ? row.name : null;
}

/**
 * Upsert a call record from a Twilio status callback payload.
 * Handles all Twilio call statuses correctly.
 */
function upsertCall(params) {
  const db = getDb();
  const {
    CallSid,
    CallStatus,
    Direction,
    From,
    To,
    CallDuration,
    Timestamp,
  } = params;

  if (!CallSid || !CallStatus) {
    logger.warn('upsertCall called with missing required params', { CallSid, CallStatus });
    return;
  }

  // Normalize direction: Twilio sends 'inbound' or 'outbound-api'/'outbound-dial'
  const direction = Direction && Direction.startsWith('outbound') ? 'outbound' : 'inbound';

  // Determine the display numbers
  const fromNumber = From || '';
  const toNumber = To || '';

  // Look up contact name for the relevant party
  const contactPhone = direction === 'inbound' ? fromNumber : toNumber;
  const contactName = lookupContactName(contactPhone);

  const durationSec = CallDuration ? parseInt(CallDuration, 10) : 0;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id, status FROM calls WHERE call_sid = ?').get(CallSid);

  if (!existing) {
    // Insert new record
    db.prepare(`
      INSERT INTO calls (call_sid, direction, status, from_number, to_number, contact_name, duration_sec, started_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(CallSid, direction, CallStatus, fromNumber, toNumber, contactName, durationSec, now, now);
    logger.info('Call record created', { CallSid, CallStatus, direction });
  } else {
    // Update existing record
    if (CallStatus === 'completed') {
      db.prepare(`
        UPDATE calls
        SET status = ?, duration_sec = ?, ended_at = ?, contact_name = COALESCE(?, contact_name)
        WHERE call_sid = ?
      `).run(CallStatus, durationSec, now, contactName, CallSid);
      logger.info('Call completed', { CallSid, durationSec });
    } else if (CallStatus === 'in-progress') {
      db.prepare(`
        UPDATE calls
        SET status = ?, started_at = COALESCE(started_at, ?), contact_name = COALESCE(?, contact_name)
        WHERE call_sid = ?
      `).run(CallStatus, now, contactName, CallSid);
    } else {
      db.prepare(`
        UPDATE calls
        SET status = ?, contact_name = COALESCE(?, contact_name)
        WHERE call_sid = ?
      `).run(CallStatus, contactName, CallSid);
    }
    logger.info('Call record updated', { CallSid, CallStatus });
  }
}

/**
 * Get paginated call list with optional filter and search.
 */
function getCalls({ page = 1, limit = 20, filter = 'all', search = '' }) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const conditions = [];
  const bindParams = [];

  if (filter === 'missed') {
    conditions.push(`(status IN ('no-answer','busy','failed') AND direction = 'inbound')`);
  } else if (filter === 'inbound') {
    conditions.push(`direction = 'inbound'`);
  } else if (filter === 'outbound') {
    conditions.push(`direction = 'outbound'`);
  }

  if (search) {
    conditions.push(`(from_number LIKE ? OR to_number LIKE ? OR contact_name LIKE ?)`);
    const s = `%${search}%`;
    bindParams.push(s, s, s);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM calls ${where}`).get(...bindParams);
  const total = countRow.total;

  const rows = db.prepare(`
    SELECT * FROM calls ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...bindParams, limit, offset);

  return { calls: rows, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * Get call statistics.
 */
function getCallStats() {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as n FROM calls').get().n;
  const missed = db.prepare(`SELECT COUNT(*) as n FROM calls WHERE status IN ('no-answer','busy','failed') AND direction = 'inbound'`).get().n;
  const inbound = db.prepare(`SELECT COUNT(*) as n FROM calls WHERE direction = 'inbound'`).get().n;
  const outbound = db.prepare(`SELECT COUNT(*) as n FROM calls WHERE direction = 'outbound'`).get().n;
  const avgRow = db.prepare('SELECT AVG(duration_sec) as avg FROM calls WHERE status = ?').get('completed');
  const avgDuration = Math.round(avgRow.avg || 0);

  return { total, missed, inbound, outbound, avgDuration };
}

/**
 * Get a single call by ID.
 */
function getCallById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM calls WHERE id = ?').get(id);
}

/**
 * Update notes for a call.
 */
function updateCallNotes(id, notes) {
  const db = getDb();
  const result = db.prepare('UPDATE calls SET notes = ? WHERE id = ?').run(notes, id);
  return result.changes > 0;
}

/**
 * Delete a call record.
 */
function deleteCall(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM calls WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Dashboard: today's summary and calls by hour.
 */
function getDashboardData() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const todayCalls = db.prepare(`SELECT COUNT(*) as n FROM calls WHERE date(created_at) = ?`).get(today).n;
  const missedToday = db.prepare(`
    SELECT COUNT(*) as n FROM calls
    WHERE date(created_at) = ? AND status IN ('no-answer','busy','failed') AND direction = 'inbound'
  `).get(today).n;

  const minutesRow = db.prepare(`
    SELECT COALESCE(SUM(duration_sec), 0) as total FROM calls
    WHERE date(created_at) = ? AND status = 'completed'
  `).get(today);
  const totalMinutes = Math.round(minutesRow.total / 60);

  const totalAllTime = db.prepare('SELECT COUNT(*) as n FROM calls').get().n;

  const recentCalls = db.prepare(`
    SELECT * FROM calls ORDER BY created_at DESC LIMIT 5
  `).all();

  // Calls by hour (0–23) for today
  const hourRows = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
    FROM calls
    WHERE date(created_at) = ?
    GROUP BY hour
  `).all(today);

  const callsByHour = Array.from({ length: 24 }, (_, i) => {
    const found = hourRows.find((r) => r.hour === i);
    return { hour: i, count: found ? found.count : 0 };
  });

  return { todayCalls, missedToday, totalMinutes, totalAllTime, recentCalls, callsByHour };
}

module.exports = {
  upsertCall,
  getCalls,
  getCallStats,
  getCallById,
  updateCallNotes,
  deleteCall,
  getDashboardData,
  lookupContactName,
};
