'use strict';

const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');
const logger = require('../logger');

function runMigrations() {
  const db = getDb();
  const migrationsDir = path.join(__dirname, 'migrations');

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  logger.info(`Running ${files.length} migration(s)...`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      db.exec(sql);
      logger.info(`Migration applied: ${file}`);
    } catch (err) {
      logger.error(`Migration failed: ${file}`, { error: err.message });
      throw err;
    }
  }

  logger.info('All migrations completed successfully');
}

module.exports = { runMigrations };
