'use strict';

/**
 * trace.js — /api/trace routes
 * Graph traversal endpoint: returns nodes + links for fund-flow visualization.
 */

const express                = require('express');
const router                 = express.Router();
const { buildTraceGraph }    = require('../engine/graphTraversal');
const { propagateLinkage }   = require('../services/linkagePropagationService');
const { getDb }              = require('../db/database');

// ── GET /api/trace/:seed ──────────────────────────────────────────────────────
router.get('/:seed', async (req, res, next) => {
  try {
    let { seed } = req.params;
    if (!seed || seed.trim().length < 3) {
      return res.status(400).json({ error: 'Invalid seed address.' });
    }

    const db = getDb();
    seed = seed.trim();

    // 1. If seed is a case ID (e.g. CS-2026-001), resolve to case seed address
    if (seed.toUpperCase().startsWith('CS-')) {
      const inv = db.prepare('SELECT seed_address FROM investigations WHERE case_id = ? OR id = ?').get(seed, seed);
      if (inv && inv.seed_address) {
        seed = inv.seed_address;
      }
    }

    // 2. Look for exact match, case-insensitive, or prefix/LIKE match in wallets table
    let wallet = db.prepare('SELECT address FROM wallets WHERE LOWER(address) = LOWER(?)').get(seed);
    if (!wallet) {
      wallet = db.prepare('SELECT address FROM wallets WHERE LOWER(address) LIKE LOWER(?)').get(`%${seed}%`);
    }

    // 3. Check transactions table
    if (!wallet) {
      const tx = db.prepare('SELECT sender, receiver FROM transactions WHERE LOWER(sender) = LOWER(?) OR LOWER(receiver) = LOWER(?)').get(seed, seed);
      if (tx) {
        wallet = { address: tx.sender.toLowerCase() === seed.toLowerCase() ? tx.sender : tx.receiver };
      }
    }

    const targetSeed = wallet ? wallet.address : seed;

    const hops      = Math.min(parseInt(req.query.hops      ?? '3', 10), 5);
    const maxNodes  = Math.min(parseInt(req.query.maxNodes  ?? '200', 10), 500);
    const direction = ['out', 'in', 'both'].includes(req.query.direction)
      ? req.query.direction
      : 'both';

    // 4. If no transactions exist in DB for this address and it's a live on-chain address, auto-propagate
    const txCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM transactions WHERE LOWER(sender) = LOWER(?) OR LOWER(receiver) = LOWER(?)').get(targetSeed, targetSeed);
    const hasTransactions = txCountRow && txCountRow.cnt > 0;
    const isLiveAddress = !targetSeed.includes('...') && !targetSeed.startsWith('0xFRAUD_');

    if (isLiveAddress) {
      db.prepare(`
        UPDATE wallets
        SET base_risk = CASE WHEN base_risk < 40 THEN 40 ELSE base_risk END,
            type = CASE WHEN type IS NULL OR type IN ('Unknown', 'Transfer Wallet') THEN 'Seed Wallet' ELSE type END,
            label = CASE WHEN label IS NULL OR label LIKE 'Node Hop-%' THEN 'Target Address' ELSE label END,
            updated_at = datetime('now')
        WHERE LOWER(address) = LOWER(?)
      `).run(targetSeed);
    }

    if (!hasTransactions && isLiveAddress) {
      try {
        await propagateLinkage(null, targetSeed, null, Math.min(hops, 2), 30);
      } catch (err) {
        // Continue gracefully
      }
    }

    const result = await buildTraceGraph(targetSeed, hops, { maxNodes, direction });

    return res.json({
      success: true,
      nodes:   result.nodes,
      links:   result.links,
      edges:   result.edges,
      data:    result,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/trace/:seed/summary ──────────────────────────────────────────────
router.get('/:seed/summary', async (req, res, next) => {
  try {
    let { seed } = req.params;
    const db       = getDb();

    if (seed.toUpperCase().startsWith('CS-')) {
      const inv = db.prepare('SELECT seed_address FROM investigations WHERE case_id = ? OR id = ?').get(seed, seed);
      if (inv && inv.seed_address) {
        seed = inv.seed_address;
      }
    }

    let wallet = db.prepare('SELECT address FROM wallets WHERE LOWER(address) = LOWER(?)').get(seed);
    if (!wallet) {
      wallet = db.prepare('SELECT address FROM wallets WHERE LOWER(address) LIKE LOWER(?)').get(`%${seed}%`);
    }

    const targetSeed = wallet ? wallet.address : seed;
    const result = await buildTraceGraph(targetSeed, 3, { maxNodes: 500 });

    const highRiskNodes = result.nodes.filter(n => (n.riskScore || 0) >= 70);
    const allFlags      = result.nodes.flatMap(n => n.riskFlags || []);
    const flagCounts    = allFlags.reduce((acc, f) => {
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        seedAddress:     targetSeed,
        totalNodes:      result.meta.totalNodes,
        totalEdges:      result.meta.totalEdges,
        highRiskNodes:   highRiskNodes.length,
        topFlags:        Object.entries(flagCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([flag, count]) => ({ flag, count })),
        traversalMs:     result.meta.traversalMs,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
