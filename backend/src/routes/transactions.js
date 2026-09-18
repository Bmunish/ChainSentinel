'use strict';

/**
 * transactions.js — /api/transactions routes
 */

const express  = require('express');
const router   = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/transactions ─────────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const db     = getDb();
    const page   = Math.max(parseInt(req.query.page  ?? '1',  10), 1);
    const limit  = Math.min(parseInt(req.query.limit ?? '50', 10), 500);
    const offset = (page - 1) * limit;

    let sql    = 'SELECT * FROM transactions WHERE 1=1';
    const args = [];

    if (req.query.sender) {
      sql += ' AND sender LIKE ?';
      args.push(`%${req.query.sender}%`);
    }
    if (req.query.receiver) {
      sql += ' AND receiver LIKE ?';
      args.push(`%${req.query.receiver}%`);
    }
    if (req.query.wallet) {
      sql += ' AND (sender LIKE ? OR receiver LIKE ?)';
      args.push(`%${req.query.wallet}%`, `%${req.query.wallet}%`);
    }
    if (req.query.token || req.query.asset) {
      sql += ' AND token = ?';
      args.push(req.query.token || req.query.asset);
    }
    if (req.query.chain) {
      sql += ' AND chain = ?';
      args.push(req.query.chain);
    }
    if (req.query.flagged === '1' || req.query.flagged === 'true') {
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

    const totalRow  = db.prepare(`SELECT COUNT(*) AS cnt FROM (${sql})`).get(...args);
    const txs       = db.prepare(`${sql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
                        .all(...args, limit, offset);

    const formatted = txs.map(t => ({
      id: t.notes && t.notes.startsWith('TX-') ? t.notes.split(' ')[0] : (t.tx_hash.startsWith('TX-') ? t.tx_hash : `TX-${t.tx_hash.slice(2, 6).toUpperCase()}`),
      tx_hash: t.tx_hash,
      hash: t.tx_hash,
      from: t.sender,
      to: t.receiver,
      sender: t.sender,
      receiver: t.receiver,
      value: t.value_display || `$${Math.round(t.amount).toLocaleString()}`,
      amount: t.amount,
      asset: t.token,
      token: t.token,
      chain: t.chain || 'Ethereum',
      time: t.timestamp.includes('IST') ? t.timestamp : `${t.timestamp.slice(0, 10)} • ${t.timestamp.slice(11, 16)} IST`,
      timestamp: t.timestamp,
      risk: t.flagged ? 88 : 42,
      prov: t.provenance || 'OBSERVED',
      flagged: t.flagged === 1,
      notes: t.notes,
    }));

    return res.json({
      success: true,
      data:    formatted,
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
    const tx = db.prepare('SELECT * FROM transactions WHERE tx_hash = ? OR id = ? OR notes LIKE ?')
                 .get(req.params.txHash, req.params.txHash, `%${req.params.txHash}%`);

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    return res.json({
      success: true,
      data: {
        id: tx.notes && tx.notes.startsWith('TX-') ? tx.notes.split(' ')[0] : tx.tx_hash,
        tx_hash: tx.tx_hash,
        hash: tx.tx_hash,
        from: tx.sender,
        to: tx.receiver,
        sender: tx.sender,
        receiver: tx.receiver,
        value: tx.value_display || `$${Math.round(tx.amount).toLocaleString()}`,
        amount: tx.amount,
        asset: tx.token,
        token: tx.token,
        chain: tx.chain || 'Ethereum',
        time: tx.timestamp,
        risk: tx.flagged ? 88 : 42,
        prov: tx.provenance || 'OBSERVED',
        flagged: tx.flagged === 1,
        notes: tx.notes,
      },
    });
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
      SET flagged = ?, notes = coalesce(?, notes)
      WHERE tx_hash = ? OR notes LIKE ?
    `).run(flagged ? 1 : 0, notes, req.params.txHash, `%${req.params.txHash}%`);

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
