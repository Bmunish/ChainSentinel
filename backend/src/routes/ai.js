'use strict';

/**
 * ai.js
 * Express routes for AI-Assisted Wallet Summaries & Auto-Generated Case Narratives.
 */

const express = require('express');
const router = express.Router();
const { generateWalletSummary, generateCaseNarrative } = require('../services/aiService');
const { getDb } = require('../db/database');

// ── GET /api/v1/wallets/:address/summary ──────────────────────────────────────
router.get('/wallets/:address/summary', (req, res, next) => {
  try {
    const summary = generateWalletSummary(req.params.address);
    return res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/investigations/:id/narrative ──────────────────────────────────
router.get('/investigations/:id/narrative', (req, res, next) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM narratives WHERE case_id = ? ORDER BY id DESC LIMIT 1').get(req.params.id);

    if (existing) {
      return res.json({
        success: true,
        data: {
          caseId: existing.case_id,
          title: existing.title,
          incidentSummary: existing.incident_summary,
          structuredSections: JSON.parse(existing.structured_sections || '[]'),
          allCitations: JSON.parse(existing.source_citations || '[]'),
          version: existing.version,
          createdAt: existing.created_at,
          classification: 'AI_NARRATIVE_INTELLIGENCE',
        },
      });
    }

    // Auto-generate if not yet persisted
    const narrative = generateCaseNarrative(req.params.id);
    return res.json({
      success: true,
      data: narrative,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/investigations/:id/narrative/generate ────────────────────────
router.post('/investigations/:id/narrative/generate', (req, res, next) => {
  try {
    const narrative = generateCaseNarrative(req.params.id);
    return res.json({
      success: true,
      data: narrative,
      message: 'Investigation narrative successfully synthesized from active case evidence.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
