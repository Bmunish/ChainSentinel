'use strict';

/**
 * behaviour.js — /api/behaviour routes
 */

const express = require('express');
const router = express.Router();
const { analyzeBehaviours } = require('../engine/behaviourEngine');

// ── GET /api/behaviour ────────────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const caseId = req.query.case_id || 'CS-2026-001';
    const indicators = analyzeBehaviours(caseId);
    return res.json({ success: true, data: indicators });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/behaviour/:caseId ────────────────────────────────────────────────
router.get('/:caseId', (req, res, next) => {
  try {
    const indicators = analyzeBehaviours(req.params.caseId);
    return res.json({ success: true, data: indicators });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
