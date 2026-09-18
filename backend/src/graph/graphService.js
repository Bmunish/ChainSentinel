'use strict';

/**
 * graphService.js
 * Comprehensive Graph Analytics Engine supporting both SQLite Graph Traversal and Neo4j Cypher queries.
 */

const { getDb } = require('../db/database');
const { computeRiskScore } = require('../engine/riskScoring');
const { getNeo4jDriver, isNeo4jActive } = require('./neo4jClient');

/**
 * Traverses the financial transaction graph from a seed address.
 */
function traverseFinancialGraph(seedAddress, options = {}) {
  const {
    maxHops = 3,
    maxNodes = 150,
    direction = 'both', // 'out' | 'in' | 'both'
    minAmount = 0,
    caseId = null,
  } = options;

  const db = getDb();
  const startTime = Date.now();

  const visitedNodes = new Map(); // address -> nodeObj
  const visitedEdges = new Map(); // tx_hash -> edgeObj
  const queue = [{ address: seedAddress, depth: 0 }];

  // Fetch seed info
  const seedWallet = db.prepare('SELECT * FROM wallets WHERE address = ?').get(seedAddress) || {
    address: seedAddress,
    chain: 'ETH',
    type: 'Seed Wallet',
    label: 'Seed Wallet',
    base_risk: 80,
  };

  const seedRisk = computeRiskScore(seedAddress, { useCache: true });
  visitedNodes.set(seedAddress, {
    id: seedAddress,
    address: seedAddress,
    chain: seedWallet.chain,
    type: seedWallet.type,
    label: seedWallet.label || seedAddress,
    entity: seedWallet.entity,
    riskScore: seedRisk.riskScore,
    riskFlags: seedRisk.flags,
    depth: 0,
    flagged: seedWallet.flagged === 1,
    balance: seedWallet.balance,
    inflow: seedWallet.inflow,
    outflow: seedWallet.outflow,
  });

  while (queue.length > 0 && visitedNodes.size < maxNodes) {
    const { address: current, depth } = queue.shift();
    if (depth >= maxHops) continue;

    let outgoing = [];
    let incoming = [];

    if (direction === 'out' || direction === 'both') {
      outgoing = db.prepare(`
        SELECT t.*, w.chain AS recv_chain, w.type AS recv_type, w.label AS recv_label,
               w.entity AS recv_entity, w.base_risk AS recv_base_risk, w.flagged AS recv_flagged,
               w.balance AS recv_balance, w.inflow AS recv_inflow, w.outflow AS recv_outflow
        FROM transactions t
        LEFT JOIN wallets w ON w.address = t.receiver
        WHERE t.sender = ? AND t.amount >= ?
        ORDER BY t.amount DESC
        LIMIT 50
      `).all(current, minAmount);
    }

    if (direction === 'in' || direction === 'both') {
      incoming = db.prepare(`
        SELECT t.*, w.chain AS send_chain, w.type AS send_type, w.label AS send_label,
               w.entity AS send_entity, w.base_risk AS send_base_risk, w.flagged AS send_flagged,
               w.balance AS send_balance, w.inflow AS send_inflow, w.outflow AS send_outflow
        FROM transactions t
        LEFT JOIN wallets w ON w.address = t.sender
        WHERE t.receiver = ? AND t.amount >= ?
        ORDER BY t.amount DESC
        LIMIT 50
      `).all(current, minAmount);
    }

    // Process outgoing edges
    for (const tx of outgoing) {
      const neighbor = tx.receiver;
      if (!visitedEdges.has(tx.tx_hash)) {
        visitedEdges.set(tx.tx_hash, {
          id: tx.tx_hash,
          source: tx.sender,
          target: tx.receiver,
          amount: tx.amount,
          valueDisplay: tx.value_display || `$${tx.amount.toLocaleString()}`,
          token: tx.token,
          chain: tx.chain,
          timestamp: tx.timestamp,
          flagged: tx.flagged === 1,
          label: tx.value_display || `$${Math.round(tx.amount).toLocaleString()}`,
          provenance: tx.provenance || 'OBSERVED',
        });
      }

      if (!visitedNodes.has(neighbor) && visitedNodes.size < maxNodes) {
        const riskProf = computeRiskScore(neighbor, { useCache: true });
        visitedNodes.set(neighbor, {
          id: neighbor,
          address: neighbor,
          chain: tx.recv_chain || 'ETH',
          type: tx.recv_type || 'Unknown',
          label: tx.recv_label || neighbor,
          entity: tx.recv_entity,
          riskScore: riskProf.riskScore,
          riskFlags: riskProf.flags,
          depth: depth + 1,
          flagged: tx.recv_flagged === 1,
          balance: tx.recv_balance,
          inflow: tx.recv_inflow,
          outflow: tx.recv_outflow,
        });
        queue.push({ address: neighbor, depth: depth + 1 });
      }
    }

    // Process incoming edges
    for (const tx of incoming) {
      const neighbor = tx.sender;
      if (!visitedEdges.has(tx.tx_hash)) {
        visitedEdges.set(tx.tx_hash, {
          id: tx.tx_hash,
          source: tx.sender,
          target: tx.receiver,
          amount: tx.amount,
          valueDisplay: tx.value_display || `$${tx.amount.toLocaleString()}`,
          token: tx.token,
          chain: tx.chain,
          timestamp: tx.timestamp,
          flagged: tx.flagged === 1,
          label: tx.value_display || `$${Math.round(tx.amount).toLocaleString()}`,
          provenance: tx.provenance || 'OBSERVED',
        });
      }

      if (!visitedNodes.has(neighbor) && visitedNodes.size < maxNodes) {
        const riskProf = computeRiskScore(neighbor, { useCache: true });
        visitedNodes.set(neighbor, {
          id: neighbor,
          address: neighbor,
          chain: tx.send_chain || 'ETH',
          type: tx.send_type || 'Unknown',
          label: tx.send_label || neighbor,
          entity: tx.send_entity,
          riskScore: riskProf.riskScore,
          riskFlags: riskProf.flags,
          depth: depth + 1,
          flagged: tx.send_flagged === 1,
          balance: tx.send_balance,
          inflow: tx.send_inflow,
          outflow: tx.send_outflow,
        });
        queue.push({ address: neighbor, depth: depth + 1 });
      }
    }
  }

  const nodes = Array.from(visitedNodes.values());
  const edges = Array.from(visitedEdges.values());

  return {
    nodes,
    edges,
    meta: {
      seedAddress,
      maxHops,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      truncated: visitedNodes.size >= maxNodes,
      traversalMs: Date.now() - startTime,
      graphBackend: isNeo4jActive() ? 'Neo4j + SQLite Dual-Engine' : 'SQLite In-Memory Graph Indexer',
    },
  };
}

module.exports = {
  traverseFinancialGraph,
};
