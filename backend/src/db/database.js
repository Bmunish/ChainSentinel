'use strict';

/**
 * database.js
 * Singleton SQLite connection with automatic schema migration.
 * Uses better-sqlite3 for synchronous, high-performance access.
 */

require('dotenv').config();
const path   = require('path');
const fs     = require('fs');
const Database = require('better-sqlite3');

const DB_PATH    = process.env.DB_PATH || path.join(__dirname, '../../data/chainsentinel.db');
const SCHEMA_SQL = path.join(__dirname, 'schema.sql');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db = null;

/**
 * Returns the singleton database connection, initialising it on first call.
 * @returns {import('better-sqlite3').Database}
 */
function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Performance pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -64000');   // 64 MB page cache
  _db.pragma('temp_store = MEMORY');

  // Run schema migration
  const schemaSql = fs.readFileSync(SCHEMA_SQL, 'utf8');
  _db.exec(schemaSql);

  console.log(`[DB] Connected → ${DB_PATH}`);
  return _db;
}

/**
 * Closes the database connection (used in tests / graceful shutdown).
 */
function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
    console.log('[DB] Connection closed.');
  }
}

/**
 * Wipes all data (for seeding / test resets) — keeps schema intact.
 */
function resetDb() {
  const db = getDb();
  db.exec(`
    DELETE FROM risk_cache;
    DELETE FROM transactions;
    DELETE FROM wallets;
    DELETE FROM investigations;
  `);
}

module.exports = { getDb, closeDb, resetDb };
