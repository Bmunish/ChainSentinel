'use strict';

/**
 * trace.js — /api/trace routes
 * Graph traversal endpoint: returns nodes + edges for fund-flow visualization.
 */

const express           = require('express');
const router            = express.Router();
const { traverseGraph } = require('../engine/graphTraversal');
const { getDb }         = require('../db/database');

// ── GET /api/trace/:seed ──────────────────────────────────────────────────────
router.get('/:seed', (req, res, next) => {
  try {
    let { seed } = req.params;
    if (!seed || seed.trim().length < 3) {
      return res.status(400).json({ error: 'Invalid seed address.' });
    }

    const db = getDb();
    seed = seed.trim();

    // Look for exact match, or prefix / LIKE match
    let wallet = db.prepare('SELECT address FROM wallets WHERE address = ?').get(seed);
    if (!wallet) {
      wallet = db.prepare('SELECT address FROM wallets WHERE address LIKE ?').get(`%${seed}%`);
    }

    const resolvedSeed = wallet ? wallet.address : seed;

    // If still not found, check if it's in transactions
    if (!wallet) {
      const tx = db.prepare('SELECT sender FROM transactions WHERE sender LIKE ? OR receiver LIKE ?').get(`%${seed}%`, `%${seed}%`);
      if (tx) {
        wallet = { address: tx.sender };
      }
    }

    const targetSeed = wallet ? wallet.address : resolvedSeed;

    const hops      = Math.min(parseInt(req.query.hops      ?? '3', 10), 5);
    const maxNodes  = Math.min(parseInt(req.query.maxNodes  ?? '150', 10), 500);
    const direction = ['out', 'in', 'both'].includes(req.query.direction)
      ? req.query.direction
      : 'both';

    const result = traverseGraph(targetSeed, { maxHops: hops, maxNodes, direction });

    return res.json({
      success: true,
      data:    result,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/trace/:seed/summary ──────────────────────────────────────────────
router.get('/:seed/summary', (req, res, next) => {
  try {
    const { seed } = req.params;
    const db       = getDb();

    let wallet = db.prepare('SELECT address FROM wallets WHERE address = ?').get(seed);
    if (!wallet) {
      wallet = db.prepare('SELECT address FROM wallets WHERE address LIKE ?').get(`%${seed}%`);
    }

    const targetSeed = wallet ? wallet.address : seed;
    const result = traverseGraph(targetSeed, { maxHops: 3, maxNodes: 500 });

    const highRiskNodes = result.nodes.filter(n => n.riskScore >= 70);
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
        truncated:       result.meta.truncated,
        traversalMs:     result.meta.traversalMs,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
