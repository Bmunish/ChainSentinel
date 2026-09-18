'use strict';

/**
 * alerts.js — /api/alerts routes
 */

const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db/database');

// ── GET /api/alerts ───────────────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { case_id, level, status } = req.query;

    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const args = [];

    if (case_id) { sql += ' AND case_id = ?'; args.push(case_id); }
    if (level) { sql += ' AND level = ?'; args.push(level.toUpperCase()); }
    if (status) { sql += ' AND status = ?'; args.push(status.toUpperCase()); }

    sql += ' ORDER BY created_at DESC';
    const alerts = db.prepare(sql).all(...args);

    const formatted = alerts.map(a => ({
      id: a.id,
      level: a.level,
      title: a.title,
      desc: a.description,
      case: a.case_id,
      risk: a.risk_score,
      status: a.status,
      wallet: a.wallet_address,
      tx: a.tx_hash,
      created: a.created_at,
    }));

    return res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/alerts/:id ───────────────────────────────────────────────────────
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const a = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Alert not found.' });

    return res.json({
      success: true,
      data: {
        id: a.id,
        level: a.level,
        title: a.title,
        desc: a.description,
        case: a.case_id,
        risk: a.risk_score,
        status: a.status,
        wallet: a.wallet_address,
        tx: a.tx_hash,
        created: a.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/alerts/:id/status ──────────────────────────────────────────────
router.patch('/:id/status', (req, res, next) => {
  try {
    const db = getDb();
    const { status = 'ACKNOWLEDGED', officerId = 'CP-FCI-042' } = req.body || {};

    const result = db.prepare(`
      UPDATE alerts
      SET status = ?, acknowledged_at = datetime('now'), acknowledged_by = ?
      WHERE id = ?
    `).run(status.toUpperCase(), officerId, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Alert not found.' });

    logAudit(officerId, `Updated alert ${req.params.id} to ${status}`, 'Alert', req.params.id, 'Success');

    return res.json({ success: true, message: `Alert status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
