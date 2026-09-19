'use strict';

/**
 * wallets.js — /api/wallets routes
 */

const express              = require('express');
const router               = express.Router();
const { getDb }            = require('../db/database');
const { computeRiskScore } = require('../engine/riskScoring');
const { analyzeWalletClusters } = require('../engine/clusteringEngine');
const { propagateLinkage } = require('../services/linkagePropagationService');

// ── GET /api/wallets ──────────────────────────────────────────────────────────
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
      sql += ' AND (base_risk >= ? OR risk_score >= ?)';
      const r = parseFloat(req.query.minRisk);
      args.push(r, r);
    }
    if (req.query.q) {
      sql += ' AND (address LIKE ? OR label LIKE ? OR entity LIKE ?)';
      const like = `%${req.query.q}%`;
      args.push(like, like, like);
    }

    const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM (${sql})`).get(...args);
    const wallets  = db.prepare(`${sql} ORDER BY base_risk DESC LIMIT ? OFFSET ?`)
                       .all(...args, limit, offset);

    // Format fields for frontend compatibility
    const formatted = wallets.map(w => {
      const riskProf = computeRiskScore(w.address, { useCache: true });
      const score = Math.round(w.risk_score || riskProf.riskScore || w.base_risk);
      const riskLevel = score >= 90 ? 'CRITICAL' : score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';

      // Find linked counterparties
      const links = db.prepare(`
        SELECT DISTINCT CASE WHEN sender = ? THEN receiver ELSE sender END AS peer
        FROM transactions WHERE sender = ? OR receiver = ?
      `).all(w.address, w.address, w.address).map(l => l.peer);

      return {
        id: w.address,
        address: w.address,
        chain: w.chain,
        type: w.type || 'Transfer Wallet',
        label: w.label || w.address,
        entity: w.entity,
        risk: score,
        riskScore: score,
        riskLevel,
        balance: w.balance || '—',
        inflow: w.inflow || '—',
        outflow: w.outflow || '—',
        tx: w.tx_count || 12,
        first: w.first_seen || '14 Mar 2025',
        last: w.last_seen || '22 Aug 2026',
        behaviors: riskProf.flags || [],
        linked: links.slice(0, 5),
        flagged: w.flagged === 1,
        predictedHop: w.address.includes('7A3F') ? { dest: 'Exchange X', conf: 78 } : null,
      };
    });

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

// ── GET /api/wallets/:address ─────────────────────────────────────────────────
router.get('/:address', (req, res, next) => {
  try {
    const db     = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE address = ?')
                     .get(req.params.address);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const riskProf = computeRiskScore(wallet.address, { useCache: true });
    const score = Math.round(wallet.risk_score || riskProf.riskScore || wallet.base_risk);
    const riskLevel = score >= 90 ? 'CRITICAL' : score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';

    const links = db.prepare(`
      SELECT DISTINCT CASE WHEN sender = ? THEN receiver ELSE sender END AS peer
      FROM transactions WHERE sender = ? OR receiver = ?
    `).all(wallet.address, wallet.address, wallet.address).map(l => l.peer);

    return res.json({
      success: true,
      data: {
        id: wallet.address,
        address: wallet.address,
        chain: wallet.chain,
        type: wallet.type || 'Transfer Wallet',
        label: wallet.label || wallet.address,
        entity: wallet.entity,
        risk: score,
        riskScore: score,
        riskLevel,
        balance: wallet.balance || '—',
        inflow: wallet.inflow || '—',
        outflow: wallet.outflow || '—',
        tx: wallet.tx_count || 12,
        first: wallet.first_seen || '14 Mar 2025',
        last: wallet.last_seen || '22 Aug 2026',
        behaviors: riskProf.flags || [],
        linked: links.slice(0, 5),
        flagged: wallet.flagged === 1,
        predictedHop: wallet.address.includes('7A3F') ? { dest: 'Exchange X', conf: 78 } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/wallets/:address/cluster ─────────────────────────────────────────
router.get('/:address/cluster', (req, res, next) => {
  try {
    const cluster = analyzeWalletClusters(req.params.address);
    return res.json({ success: true, data: cluster });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/wallets/:address/risk ────────────────────────────────────────────
router.get('/:address/risk', async (req, res, next) => {
  try {
    const db      = getDb();
    const wallet  = db.prepare('SELECT address FROM wallets WHERE LOWER(address) = LOWER(?)')
                      .get(req.params.address);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const refresh = req.query.refresh === 'true';
    let dataSource = 'LOCAL_INDEX';
    let liveTransactionCount = null;

    if (refresh && !wallet.address.includes('...') && !wallet.address.startsWith('0xFRAUD_')) {
      db.prepare('DELETE FROM transactions WHERE LOWER(sender) = LOWER(?) OR LOWER(receiver) = LOWER(?)')
        .run(wallet.address, wallet.address);
      const propagation = await propagateLinkage(null, wallet.address, null, 1, 25);
      liveTransactionCount = propagation.totalTransactionsIngested;
      dataSource = 'LIVE_PROVIDER';
    }

    const profile  = computeRiskScore(wallet.address, { useCache: false });

    return res.json({
      success: true,
      data: { ...profile, dataSource, liveTransactionCount },
    });
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
    const dir    = req.query.direction ?? 'both';

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

    const formatted = txs.map(t => ({
      id: t.tx_hash.startsWith('0x') && t.tx_hash.length > 15 ? `TX-${t.tx_hash.slice(2, 6).toUpperCase()}` : t.tx_hash,
      hash: t.tx_hash,
      from: t.sender,
      to: t.receiver,
      value: t.value_display || `$${Math.round(t.amount).toLocaleString()}`,
      amount: t.amount,
      asset: t.token,
      chain: t.chain || 'Ethereum',
      time: t.timestamp,
      risk: t.flagged ? 88 : 42,
      prov: t.provenance || 'OBSERVED',
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
