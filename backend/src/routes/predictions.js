'use strict';

/**
 * predictions.js — /api/predictions routes
 */

const express = require('express');
const router = express.Router();
const { generatePredictions } = require('../engine/predictionEngine');

router.get('/', (req, res, next) => {
  try {
    const caseId = req.query.case_id || 'CS-2026-001';
    const preds = generatePredictions(caseId);
    return res.json({ success: true, data: preds });
  } catch (err) {
    next(err);
  }
});

router.get('/:caseId', (req, res, next) => {
  try {
    const preds = generatePredictions(req.params.caseId);
    return res.json({ success: true, data: preds });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
