'use strict';

/**
 * graphTraversal.js
 * ──────────────────────────────────────────────────────────────────────────
 * Breadth-First Search traversal of the transaction graph.
 *
 * Starting from a seed wallet address, it follows OUTGOING and INCOMING
 * transaction edges for up to MAX_HOPS levels. A visited set prevents
 * infinite loops on cyclic graphs.
 *
 * Returns: { nodes[], edges[] } — ready for direct graph rendering.
 * ──────────────────────────────────────────────────────────────────────────
 */

const { getDb }           = require('../db/database');
const { computeRiskScore } = require('./riskScoring');

const DEFAULT_MAX_HOPS    = 3;
const DEFAULT_MAX_NODES   = 150;  // Safety cap — prevents runaway queries
const DEFAULT_DIRECTION   = 'both'; // 'out' | 'in' | 'both'

// ── Query helpers ─────────────────────────────────────────────────────────────

/** Fetch all outgoing transactions from a wallet */
function getOutgoing(db, address) {
  return db.prepare(`
    SELECT t.tx_hash, t.sender, t.receiver, t.amount, t.token,
           t.timestamp, t.block_number, t.fee, t.flagged, t.notes,
           w.chain, w.type, w.label, w.entity, w.base_risk, w.flagged AS wallet_flagged
    FROM   transactions t
    JOIN   wallets      w ON w.address = t.receiver
    WHERE  t.sender = ?
    ORDER  BY t.timestamp ASC
  `).all(address);
}

/** Fetch all incoming transactions to a wallet */
function getIncoming(db, address) {
  return db.prepare(`
    SELECT t.tx_hash, t.sender, t.receiver, t.amount, t.token,
           t.timestamp, t.block_number, t.fee, t.flagged, t.notes,
           w.chain, w.type, w.label, w.entity, w.base_risk, w.flagged AS wallet_flagged
    FROM   transactions t
    JOIN   wallets      w ON w.address = t.sender
    WHERE  t.receiver = ?
    ORDER  BY t.timestamp ASC
  `).all(address);
}

/** Fetch wallet metadata */
function getWalletMeta(db, address) {
  return db.prepare(`
    SELECT address, chain, type, label, entity, base_risk, flagged
    FROM   wallets
    WHERE  address = ?
  `).get(address) || {
    address,
    chain:     'Unknown',
    type:      'Unknown',
    label:     null,
    entity:    null,
    base_risk: 0,
    flagged:   0,
  };
}

// ── Node & Edge builders ──────────────────────────────────────────────────────

function buildNode(address, walletMeta, riskProfile, depth) {
  return {
    id:         address,
    address,
    chain:      walletMeta.chain,
    type:       walletMeta.type,
    label:      walletMeta.label || address.slice(0, 10) + '…',
    entity:     walletMeta.entity || null,
    riskScore:  riskProfile.riskScore,
    riskFlags:  riskProfile.flags,
    baseRisk:   walletMeta.base_risk,
    flagged:    Boolean(walletMeta.flagged),
    depth,                              // hop distance from seed
    group:      walletMeta.type,        // used by graph layouts for clustering
  };
}

function buildEdge(tx) {
  return {
    id:          tx.tx_hash,
    source:      tx.sender,
    target:      tx.receiver,
    amount:      tx.amount,
    token:       tx.token,
    timestamp:   tx.timestamp,
    blockNumber: tx.block_number || null,
    fee:         tx.fee || 0,
    flagged:     Boolean(tx.flagged),
    notes:       tx.notes || null,
    label:       `${tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} ${tx.token}`,
  };
}

// ── BFS Traversal ─────────────────────────────────────────────────────────────

/**
 * Traverses the transaction graph from a seed address using BFS.
 *
 * @param {string} seedAddress  - Starting wallet address
 * @param {object} [opts]
 * @param {number} [opts.maxHops=3]       - Maximum hop depth
 * @param {number} [opts.maxNodes=150]    - Maximum total nodes (safety cap)
 * @param {'out'|'in'|'both'} [opts.direction='both'] - Edge direction to follow
 * @returns {{
 *   nodes: object[],
 *   edges: object[],
 *   meta: {
 *     seedAddress: string,
 *     totalNodes: number,
 *     totalEdges: number,
 *     maxHops: number,
 *     truncated: boolean,
 *     traversalMs: number
 *   }
 * }}
 */
function traverseGraph(seedAddress, opts = {}) {
  const startTime = Date.now();
  const db        = getDb();

  const maxHops   = Math.min(opts.maxHops   ?? DEFAULT_MAX_HOPS,   5);   // hard cap at 5
  const maxNodes  = Math.min(opts.maxNodes  ?? DEFAULT_MAX_NODES, 500);
  const direction = opts.direction ?? DEFAULT_DIRECTION;

  const nodesMap    = new Map();   // address → node object
  const edgesMap    = new Map();   // tx_hash → edge object
  const visited     = new Set();   // addresses already expanded
  let   truncated   = false;

  // BFS queue: { address, depth }
  const queue = [{ address: seedAddress, depth: 0 }];

  while (queue.length > 0) {
    const { address, depth } = queue.shift();

    if (visited.has(address)) continue;
    visited.add(address);

    // Safety cap
    if (nodesMap.size >= maxNodes) {
      truncated = true;
      break;
    }

    // Add this wallet as a node if not already present
    if (!nodesMap.has(address)) {
      const meta        = getWalletMeta(db, address);
      const riskProfile = computeRiskScore(address);
      nodesMap.set(address, buildNode(address, meta, riskProfile, depth));
    }

    // Don't expand beyond maxHops
    if (depth >= maxHops) continue;

    // Fetch edges based on direction setting
    const txBatches = [];
    if (direction === 'out'  || direction === 'both') txBatches.push(getOutgoing(db, address));
    if (direction === 'in'   || direction === 'both') txBatches.push(getIncoming(db, address));

    for (const txList of txBatches) {
      for (const tx of txList) {
        // Register edge
        if (!edgesMap.has(tx.tx_hash)) {
          edgesMap.set(tx.tx_hash, buildEdge(tx));
        }

        // Determine the neighbouring address
        const neighbour = tx.sender === address ? tx.receiver : tx.sender;

        // Add neighbour node even if not yet expanded (so isolated nodes visible)
        if (!nodesMap.has(neighbour)) {
          const meta        = getWalletMeta(db, neighbour);
          const riskProfile = computeRiskScore(neighbour);
          nodesMap.set(neighbour, buildNode(neighbour, meta, riskProfile, depth + 1));
        }

        // Enqueue for expansion if not yet visited
        if (!visited.has(neighbour)) {
          queue.push({ address: neighbour, depth: depth + 1 });
        }
      }
    }
  }

  const nodes = Array.from(nodesMap.values());
  const edges = Array.from(edgesMap.values());

  return {
    nodes,
    edges,
    meta: {
      seedAddress,
      totalNodes:  nodes.length,
      totalEdges:  edges.length,
      maxHops,
      direction,
      truncated,
      traversalMs: Date.now() - startTime,
    },
  };
}

module.exports = { traverseGraph };
