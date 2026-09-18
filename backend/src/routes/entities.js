'use strict';

/**
 * entities.js — /api/entities routes
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/entities ─────────────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const entities = db.prepare('SELECT * FROM entities ORDER BY id ASC').all();
    return res.json({ success: true, data: entities });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/entities/correlation/:caseId ─────────────────────────────────────
router.get('/correlation/:caseId?', (req, res, next) => {
  try {
    const linked = [
      { id: 'Wallet 0x7A3F...B91F', type: 'Seed address', conf: 'CONFIRMED' },
      { id: 'Wallet 0x12AB...A8C', type: 'Transfer hop 1', conf: 'CONFIRMED' },
      { id: 'Exchange Account EX-A021', type: 'KYC partial', conf: 'STRONG' },
      { id: 'Bank Account ••••4219', type: 'Source funds', conf: 'CONFIRMED' },
      { id: 'OSINT reference', type: 'Public mention', conf: 'UNVERIFIED' },
    ];
    return res.json({ success: true, data: linked });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
