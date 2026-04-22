'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');
const logger = require('../logger');

let db;

function getDb() {
  if (!db) {
    const dbPath = path.resolve(process.cwd(), config.db.path);
    db = new Database(dbPath, {
      verbose: config.server.nodeEnv === 'development' ? (msg) => logger.debug(msg) : null,
    });
    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

module.exports = { getDb, closeDb };
