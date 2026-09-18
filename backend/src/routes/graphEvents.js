'use strict';

/**
 * graphEvents.js
 * Express routes for graph animation discovery steps and live graph events.
 */

const express = require('express');
const router = express.Router();
const { getGraphDiscoveryEvents } = require('../services/graphAnimationService');
const { getDb } = require('../db/database');

// ── GET /api/v1/graph/:case_id/events ─────────────────────────────────────────
router.get('/:case_id/events', (req, res, next) => {
  try {
    const caseId = req.params.case_id || 'CS-2026-001';
    const db = getDb();
    const c = db.prepare('SELECT * FROM investigations WHERE case_id = ?').get(caseId);
    const seed = c ? (c.seed_address || '0x7A3F...B91F') : '0x7A3F...B91F';

    const events = getGraphDiscoveryEvents(caseId, seed);

    return res.json({
      success: true,
      data: {
        caseId,
        seedAddress: seed,
        totalSteps: events.length,
        events,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
