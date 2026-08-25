'use strict';

/**
 * transactions.js — /api/transactions routes
 */

const express  = require('express');
const router   = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/transactions ─────────────────────────────────────────────────────
/**
 * @route   GET /api/transactions
 * @query   sender     filter by sender address
 * @query   receiver   filter by receiver address
 * @query   token      filter by token
 * @query   flagged    '1' to show only flagged transactions
 * @query   minAmount  minimum USD amount
 * @query   maxAmount  maximum USD amount
 * @query   from       ISO datetime start filter
 * @query   to         ISO datetime end filter
 * @query   page       page number (default 1)
 * @query   limit      page size (default 50)
 */
router.get('/', (req, res, next) => {
  try {
    const db     = getDb();
    const page   = Math.max(parseInt(req.query.page  ?? '1',  10), 1);
    const limit  = Math.min(parseInt(req.query.limit ?? '50', 10), 500);
    const offset = (page - 1) * limit;

    let sql    = 'SELECT * FROM transactions WHERE 1=1';
    const args = [];

    if (req.query.sender) {
      sql += ' AND sender = ?';
      args.push(req.query.sender);
    }
    if (req.query.receiver) {
      sql += ' AND receiver = ?';
      args.push(req.query.receiver);
    }
    if (req.query.token) {
      sql += ' AND token = ?';
      args.push(req.query.token);
    }
    if (req.query.flagged === '1') {
      sql += ' AND flagged = 1';
    }
    if (req.query.minAmount) {
      sql += ' AND amount >= ?';
      args.push(parseFloat(req.query.minAmount));
    }
    if (req.query.maxAmount) {
      sql += ' AND amount <= ?';
      args.push(parseFloat(req.query.maxAmount));
    }
    if (req.query.from) {
      sql += ' AND timestamp >= ?';
      args.push(req.query.from);
    }
    if (req.query.to) {
      sql += ' AND timestamp <= ?';
      args.push(req.query.to);
    }

    const totalRow  = db.prepare(`SELECT COUNT(*) AS cnt FROM (${sql})`).get(...args);
    const txs       = db.prepare(`${sql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
                        .all(...args, limit, offset);

    return res.json({
      success: true,
      data:    txs,
      pagination: {
        page,
        limit,
        total: totalRow.cnt,
        pages: Math.ceil(totalRow.cnt / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/transactions/:txHash ─────────────────────────────────────────────
router.get('/:txHash', (req, res, next) => {
  try {
    const db = getDb();
    const tx = db.prepare('SELECT * FROM transactions WHERE tx_hash = ?')
                 .get(req.params.txHash);

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    return res.json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/transactions/:txHash/flag ───────────────────────────────────────
router.post('/:txHash/flag', (req, res, next) => {
  try {
    const db    = getDb();
    const { flagged = 1, notes = null } = req.body || {};

    const result = db.prepare(`
      UPDATE transactions
      SET flagged = ?, notes = ?
      WHERE tx_hash = ?
    `).run(flagged ? 1 : 0, notes, req.params.txHash);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    return res.json({ success: true, message: 'Transaction flag updated.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/transactions/stats/overview ──────────────────────────────────────
router.get('/stats/overview', (req, res, next) => {
  try {
    const db = getDb();

    const stats = db.prepare(`
      SELECT
        COUNT(*)                                             AS total_transactions,
        SUM(amount)                                          AS total_volume_usd,
        AVG(amount)                                          AS avg_tx_amount,
        MAX(amount)                                          AS max_tx_amount,
        COUNT(DISTINCT sender)                               AS unique_senders,
        COUNT(DISTINCT receiver)                             AS unique_receivers,
        SUM(CASE WHEN flagged = 1 THEN 1 ELSE 0 END)        AS flagged_count,
        MIN(timestamp)                                       AS earliest_tx,
        MAX(timestamp)                                       AS latest_tx
      FROM transactions
    `).get();

    const tokenBreakdown = db.prepare(`
      SELECT token, COUNT(*) AS count, SUM(amount) AS volume
      FROM   transactions
      GROUP  BY token
      ORDER  BY volume DESC
    `).all();

    return res.json({
      success: true,
      data: {
        overview:       stats,
        tokenBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
