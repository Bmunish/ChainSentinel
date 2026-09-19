'use strict';

/**
 * trace.js — /api/trace routes
 * Graph traversal endpoint: returns nodes + links for live on-chain fund-flow visualization.
 */

const express = require('express');
const router = express.Router();
const { buildLiveTraceGraph } = require('../engine/graphTraversal');
const { propagateLinkage } = require('../services/linkagePropagationService');
const { getDb } = require('../db/database');

// ── GET /api/trace/:seed ──────────────────────────────────────────────────────
router.get('/:seed', async (req, res) => {
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

    const hops      = Math.min(parseInt(req.query.hops      ?? '2', 10), 5);
    const maxNodes  = Math.min(parseInt(req.query.maxNodes  ?? '200', 10), 500);

    // 4. Ingest on-chain transactions if not already in DB or refresh requested
    const txCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM transactions WHERE LOWER(sender) = LOWER(?) OR LOWER(receiver) = LOWER(?)').get(targetSeed, targetSeed);
    const hasTransactions = txCountRow && txCountRow.cnt > 0;
    const isLiveAddress = !targetSeed.includes('...') && !targetSeed.startsWith('0xFRAUD_');
    const refreshLive = req.query.refresh === 'true' || req.query.live === 'true';

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

    if ((!hasTransactions || refreshLive) && isLiveAddress) {
      try {
        if (refreshLive) {
          db.prepare('DELETE FROM transactions WHERE LOWER(sender) = LOWER(?) OR LOWER(receiver) = LOWER(?)').run(targetSeed, targetSeed);
        }
        await propagateLinkage(null, targetSeed, null, Math.min(hops, 2), 30);
      } catch (err) {
        console.warn(`[TRACE] Live propagation notice for ${targetSeed}:`, err.message);
      }
    }

    const graph = await buildLiveTraceGraph(targetSeed);

    return res.json({
      success: true,
      data_provenance: 'LIVE_ON_CHAIN',
      nodes: graph.nodes,
      links: graph.links,
      edges: graph.edges || graph.links,
      data: graph,
    });
  } catch (err) {
    console.error('[TRACE API ERROR]:', err);
    return res.status(500).json({ error: 'Failed to build graph from on-chain data' });
  }
});

// ── GET /api/trace/:seed/summary ──────────────────────────────────────────────
router.get('/:seed/summary', async (req, res) => {
  try {
    let { seed } = req.params;
    const db = getDb();

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
    const graph = await buildLiveTraceGraph(targetSeed);

    const highRiskNodes = graph.nodes.filter(n => (n.risk_score || n.riskScore || 0) >= 70);
    const allFlags      = graph.nodes.flatMap(n => n.riskFlags || []);
    const flagCounts    = allFlags.reduce((acc, f) => {
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data_provenance: 'LIVE_ON_CHAIN',
      data: {
        seedAddress:     targetSeed,
        totalNodes:      graph.meta?.totalNodes || graph.nodes.length,
        totalEdges:      graph.meta?.totalEdges || graph.links.length,
        highRiskNodes:   highRiskNodes.length,
        topFlags:        Object.entries(flagCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([flag, count]) => ({ flag, count })),
        traversalMs:     graph.meta?.traversalMs || 2,
      },
    });
  } catch (err) {
    console.error('[TRACE SUMMARY API ERROR]:', err);
    return res.status(500).json({ error: 'Failed to generate trace summary' });
  }
});

module.exports = router;
