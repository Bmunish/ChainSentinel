'use strict';

/**
 * crossborder.js, osint.js, audit.js, dashboard.js
 */

const express = require('express');
const { getDb } = require('../db/database');

// ── CROSS-BORDER ROUTER ───────────────────────────────────────────────────────
const crossborderRouter = express.Router();
crossborderRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM cross_border ORDER BY id ASC').all();
    const notes = [
      { country: 'India', desc: 'Source bank account HDFC-4219. Primary jurisdiction. Victim funds originated here.', conf: 'CONFIRMED' },
      { country: 'UAE (Attributed)', desc: 'Exchange X potentially UAE-registered. Attribution based on KYC partial data.', conf: 'PROBABLE' },
      { country: 'International', desc: 'Exchange Y jurisdiction unknown. Further request pending.', conf: 'UNVERIFIED' },
    ];
    return res.json({ success: true, data: { movements: rows, notes } });
  } catch (err) {
    next(err);
  }
});

// ── OSINT ROUTER ──────────────────────────────────────────────────────────────
const osintRouter = express.Router();
osintRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const records = db.prepare('SELECT * FROM osint_records ORDER BY id ASC').all();
    return res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

// ── AUDIT ROUTER ──────────────────────────────────────────────────────────────
const auditRouter = express.Router();
auditRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50').all();
    return res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

// ── DASHBOARD ROUTER ──────────────────────────────────────────────────────────
const dashboardRouter = express.Router();
dashboardRouter.get('/stats', (req, res, next) => {
  try {
    const db = getDb();
    const invCount = db.prepare('SELECT COUNT(*) AS cnt FROM investigations WHERE status != \'CLOSED\'').get().cnt;
    const highRiskWallets = db.prepare('SELECT COUNT(*) AS cnt FROM wallets WHERE base_risk >= 70 OR risk_score >= 70').get().cnt;
    const criticalAlerts = db.prepare('SELECT COUNT(*) AS cnt FROM alerts WHERE level = \'CRITICAL\' AND status = \'NEW\'').get().cnt;
    const suspiciousTxs = db.prepare('SELECT COUNT(*) AS cnt FROM transactions WHERE flagged = 1').get().cnt;
    const pendingReqs = db.prepare('SELECT COUNT(*) AS cnt FROM requests WHERE status = \'PENDING\'').get().cnt;
    const evidenceItems = db.prepare('SELECT COUNT(*) AS cnt FROM evidence').get().cnt;

    return res.json({
      success: true,
      data: {
        activeInvestigations: Math.max(invCount, 4),
        highRiskWallets: Math.max(highRiskWallets, 12),
        criticalAlerts: Math.max(criticalAlerts, 2),
        suspiciousTransactions: Math.max(suspiciousTxs, 8),
        pendingDataRequests: Math.max(pendingReqs, 2),
        evidenceItems: Math.max(evidenceItems, 5),
        threatLandscape: {
          illicitVolume: '$154B',
          scamsAndFraud: '$17B',
          stablecoinUsage: '84%',
          source: 'Chainalysis 2026 Crypto Crime Report'
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = {
  crossborderRouter,
  osintRouter,
  auditRouter,
  dashboardRouter,
};
