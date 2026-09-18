'use strict';

/**
 * timeline.js — /api/timeline routes
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/timeline ─────────────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const caseId = req.query.case_id || 'CS-2026-001';
    const events = db.prepare('SELECT * FROM timeline_events WHERE case_id = ? ORDER BY id ASC').all(caseId);

    const formatted = events.map(e => ({
      id: e.id,
      time: e.time,
      date: e.date,
      event: e.event,
      detail: e.detail,
      source: e.source,
      dot: e.dot,
      ref: e.ref || '',
    }));

    return res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
