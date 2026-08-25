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
/**
 * @route   GET /api/trace/:seed
 * @desc    Recursively traces fund flow from seed address up to N hops.
 * @query   hops      {number}  1-5   (default 3)
 * @query   direction {string}  out|in|both (default both)
 * @query   maxNodes  {number}  max graph nodes (default 150)
 * @returns {{ nodes[], edges[], meta{} }}
 */
router.get('/:seed', (req, res, next) => {
  try {
    const { seed } = req.params;
    if (!seed || seed.trim().length < 4) {
      return res.status(400).json({ error: 'Invalid seed address.' });
    }

    const db = getDb();

    // Validate seed exists in our DB
    const wallet = db.prepare('SELECT address FROM wallets WHERE address = ?').get(seed);
    if (!wallet) {
      return res.status(404).json({
        error: `Address '${seed}' not found in database. Run POST /api/seed to populate data.`,
      });
    }

    const hops      = Math.min(parseInt(req.query.hops      ?? '3', 10), 5);
    const maxNodes  = Math.min(parseInt(req.query.maxNodes  ?? '150', 10), 500);
    const direction = ['out', 'in', 'both'].includes(req.query.direction)
      ? req.query.direction
      : 'both';

    const result = traverseGraph(seed, { maxHops: hops, maxNodes, direction });

    return res.json({
      success: true,
      data:    result,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/trace/:seed/summary ──────────────────────────────────────────────
/**
 * @route   GET /api/trace/:seed/summary
 * @desc    Lightweight summary of the trace (node/edge counts only) for dashboard KPIs.
 */
router.get('/:seed/summary', (req, res, next) => {
  try {
    const { seed } = req.params;
    const db       = getDb();

    const wallet = db.prepare('SELECT address FROM wallets WHERE address = ?').get(seed);
    if (!wallet) {
      return res.status(404).json({ error: `Address '${seed}' not found.` });
    }

    const result = traverseGraph(seed, { maxHops: 3, maxNodes: 500 });

    // Aggregate high-risk nodes
    const highRiskNodes = result.nodes.filter(n => n.riskScore >= 70);
    const allFlags      = result.nodes.flatMap(n => n.riskFlags);
    const flagCounts    = allFlags.reduce((acc, f) => {
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        seedAddress:     seed,
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
