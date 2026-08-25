'use strict';

/**
 * wallets.js — /api/wallets routes
 */

const express              = require('express');
const router               = express.Router();
const { getDb }            = require('../db/database');
const { computeRiskScore } = require('../engine/riskScoring');

// ── GET /api/wallets ──────────────────────────────────────────────────────────
/**
 * @route   GET /api/wallets
 * @query   type     filter by wallet type
 * @query   chain    filter by chain
 * @query   minRisk  minimum base_risk threshold
 * @query   q        search label / address / entity
 * @query   page     pagination page (default 1)
 * @query   limit    page size (default 50)
 */
router.get('/', (req, res, next) => {
  try {
    const db      = getDb();
    const page    = Math.max(parseInt(req.query.page  ?? '1',  10), 1);
    const limit   = Math.min(parseInt(req.query.limit ?? '50', 10), 200);
    const offset  = (page - 1) * limit;

    let sql    = 'SELECT * FROM wallets WHERE 1=1';
    const args = [];

    if (req.query.type) {
      sql += ' AND type = ?';
      args.push(req.query.type);
    }
    if (req.query.chain) {
      sql += ' AND chain = ?';
      args.push(req.query.chain);
    }
    if (req.query.minRisk) {
      sql += ' AND base_risk >= ?';
      args.push(parseFloat(req.query.minRisk));
    }
    if (req.query.q) {
      sql += ' AND (address LIKE ? OR label LIKE ? OR entity LIKE ?)';
      const like = `%${req.query.q}%`;
      args.push(like, like, like);
    }

    const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM (${sql})`).get(...args);
    const wallets  = db.prepare(`${sql} ORDER BY base_risk DESC LIMIT ? OFFSET ?`)
                       .all(...args, limit, offset);

    return res.json({
      success: true,
      data:    wallets,
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

// ── GET /api/wallets/:address ─────────────────────────────────────────────────
router.get('/:address', (req, res, next) => {
  try {
    const db     = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE address = ?')
                     .get(req.params.address);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    return res.json({ success: true, data: wallet });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/wallets/:address/risk ────────────────────────────────────────────
/**
 * @route   GET /api/wallets/:address/risk
 * @query   refresh  if 'true', bypasses the 5-minute cache
 */
router.get('/:address/risk', (req, res, next) => {
  try {
    const db      = getDb();
    const wallet  = db.prepare('SELECT address FROM wallets WHERE address = ?')
                      .get(req.params.address);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const useCache = req.query.refresh !== 'true';
    const profile  = computeRiskScore(req.params.address, { useCache });

    return res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/wallets/:address/transactions ────────────────────────────────────
router.get('/:address/transactions', (req, res, next) => {
  try {
    const db     = getDb();
    const addr   = req.params.address;
    const page   = Math.max(parseInt(req.query.page  ?? '1',  10), 1);
    const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    const offset = (page - 1) * limit;
    const dir    = req.query.direction ?? 'both';  // 'out' | 'in' | 'both'

    let sql    = 'SELECT * FROM transactions WHERE ';
    const args = [];

    if (dir === 'out') {
      sql += 'sender = ?';
      args.push(addr);
    } else if (dir === 'in') {
      sql += 'receiver = ?';
      args.push(addr);
    } else {
      sql += '(sender = ? OR receiver = ?)';
      args.push(addr, addr);
    }

    const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM (${sql})`).get(...args);
    const txs      = db.prepare(`${sql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
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

// ── POST /api/wallets/:address/flag ───────────────────────────────────────────
router.post('/:address/flag', (req, res, next) => {
  try {
    const db      = getDb();
    const { flagged = 1 } = req.body || {};

    const result = db.prepare('UPDATE wallets SET flagged = ?, updated_at = datetime(\'now\') WHERE address = ?')
                     .run(flagged ? 1 : 0, req.params.address);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    return res.json({ success: true, message: `Wallet flagged status set to ${Boolean(flagged)}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
