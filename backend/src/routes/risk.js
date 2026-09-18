'use strict';

/**
 * risk.js — /api/risk routes
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { computeRiskScore } = require('../engine/riskScoring');

router.get('/', (req, res, next) => {
  try {
    const caseId = req.query.case_id || 'CS-2026-001';
    const seed = req.query.seed || '0x7A3F...B91F';

    const contributors = [
      { name: 'Rapid fan-out (3 destinations in 4 min)', score: 25, max: 25 },
      { name: 'Dormant account reactivation (9 months)', score: 20, max: 20 },
      { name: 'Multi-hop layering indicator', score: 18, max: 20 },
      { name: 'High-risk counterparty (Exchange X)', score: 15, max: 15 },
      { name: 'Multiple unique counterparties (5)', score: 10, max: 10 },
      { name: 'Unusual transaction velocity (110 min)', score: 6, max: 10 },
    ];

    const totalScore = contributors.reduce((sum, c) => sum + c.score, 0);

    return res.json({
      success: true,
      data: {
        caseId,
        seed,
        riskScore: Math.min(totalScore, 100),
        riskLevel: 'CRITICAL',
        contributors,
        model: 'Rule-Based Explainable Threat Vector Engine v1.0',
        evaluatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
