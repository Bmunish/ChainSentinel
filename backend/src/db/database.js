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
 * Helper to log an audit trail event
 */
function logAudit(officerId, action, resourceType, resourceId, result = 'Success', metadata = {}) {
  try {
    const db = getDb();
    const now = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    db.prepare(`
      INSERT INTO audit_logs (timestamp, officer_id, action, resource_type, resource_id, result, ip_address, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      now,
      officerId || 'CP-FCI-042',
      action,
      resourceType || 'System',
      resourceId || '—',
      result,
      '127.0.0.1',
      JSON.stringify(metadata)
    );
  } catch (err) {
    console.error('[Audit] Failed to log:', err.message);
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
    DELETE FROM entities;
    DELETE FROM alerts;
    DELETE FROM behaviours;
    DELETE FROM predictions;
    DELETE FROM evidence;
    DELETE FROM requests;
    DELETE FROM timeline_events;
    DELETE FROM data_sources;
    DELETE FROM osint_records;
    DELETE FROM cross_border;
    DELETE FROM audit_logs;
    DELETE FROM users;
  `);
}

module.exports = { getDb, closeDb, resetDb, logAudit };
