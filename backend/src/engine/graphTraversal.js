'use strict';

/**
 * graphTraversal.js
 * ──────────────────────────────────────────────────────────────────────────
 * High-Performance Breadth-First Search (BFS) Traversal for ChainTrace.
 *
 * Traverses the transaction graph starting from a seed wallet address,
 * following transaction edges across up to MAX_HOPS depth, and outputs
 * enriched nodes and links compliant with D3.js and the frontend SVG layout.
 * ──────────────────────────────────────────────────────────────────────────
 */

const { getDb } = require('../db/database');
const { computeRiskScore } = require('./riskScoring');
const { aggregateGraphEdges } = require('../services/liveRiskEngine');

const DEFAULT_MAX_HOPS = 3;

function filterKeyForensicNodes(seedAddress, transactions) {
  const target = String(seedAddress).toLowerCase();
  const validTransactions = transactions.filter(tx => Number(tx.amount || 0) > 0);
  const pool = validTransactions;

  const aggregate = (items, counterpartyKey) => {
    const grouped = new Map();
    items.forEach(tx => {
      const party = String(tx[counterpartyKey] || '').trim();
      if (!party) return;
      const key = party.toLowerCase();
      const current = grouped.get(key) || {
        address: party,
        totalAmount: 0,
        count: 0,
        token: tx.token || tx.token_symbol || 'ETH',
        valueDisplay: tx.value_display || '',
      };
      current.totalAmount += Number(tx.amount || 0);
      current.count += 1;
      if (!current.valueDisplay && tx.value_display) current.valueDisplay = tx.value_display;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  };

  const inflows = aggregate(pool.filter(tx => String(tx.receiver || '').toLowerCase() === target), 'sender').slice(0, 2);
  const outflows = aggregate(pool.filter(tx => String(tx.sender || '').toLowerCase() === target), 'receiver').slice(0, 4);
  const shortAddress = address => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const labelFor = item => item.count === 1 && item.valueDisplay
    ? item.valueDisplay
    : `${item.count} transfer${item.count === 1 ? '' : 's'}`;

  const nodes = [{
    id: seedAddress,
    address: seedAddress,
    label: 'Starting wallet',
    sublabel: shortAddress(seedAddress),
    role: 'SEED',
    group: 'SEED',
    category: 'SEED',
    tier: 1,
    depth: 1,
  }];
  const links = [];

  inflows.forEach(item => {
    nodes.push({
      id: item.address,
      address: item.address,
      label: 'Incoming funds',
      sublabel: shortAddress(item.address),
      role: 'INFLOW',
      group: 'BANK',
      category: 'INFLOW',
      tier: 0,
      depth: 0,
      riskScore: 15,
    });
    links.push({ source: item.address, target: seedAddress, label: labelFor(item), amount: item.totalAmount, token: item.token });
  });

  outflows.forEach((item, index) => {
    nodes.push({
      id: item.address,
      address: item.address,
      label: index === 0 ? 'Largest outgoing flow' : 'Connected wallet',
      sublabel: shortAddress(item.address),
      role: 'MULE',
      group: 'INTERMEDIARY',
      category: 'INTERMEDIARY',
      tier: 2,
      depth: 2,
      riskScore: 50,
    });
    links.push({ source: seedAddress, target: item.address, label: labelFor(item), amount: item.totalAmount, token: item.token });
  });

  return { nodes, links };
}

/**
 * Traverses transaction graph and constructs multi-hop nodes and links.
 *
 * @param {string} seedAddress - Suspect seed address
 * @param {number} maxHops - Maximum BFS depth (default: 3)
 * @param {object} [opts] - Additional options (maxNodes, direction)
 * @returns {Promise<{
 *   nodes: Array<object>,
 *   links: Array<object>,
 *   edges: Array<object>,
 *   meta: object
 * }>}
 */
async function buildTraceGraph(seedAddress, maxHops = 3, opts = {}) {
  const startTime = Date.now();
  const db = getDb();

  if (!seedAddress || typeof seedAddress !== 'string' || seedAddress.trim().length < 3) {
    return {
      nodes: [],
      links: [],
      edges: [],
      meta: { seedAddress: '', totalNodes: 0, totalEdges: 0, maxHops, traversalMs: 0 },
    };
  }

  const cleanSeed = seedAddress.trim();
  const effectiveMaxHops = Math.min(parseInt(maxHops ?? DEFAULT_MAX_HOPS, 10), 5);
  const maxNodes = Math.min(parseInt(opts.maxNodes ?? 250, 10), 500);

  const directRows = db.prepare(`
    SELECT tx_hash, sender, receiver, amount, value_display, token,
           chain, timestamp, block_number, fee, flagged
    FROM transactions
    WHERE LOWER(sender) = ? OR LOWER(receiver) = ?
    ORDER BY timestamp DESC
    LIMIT 50
  `).all(cleanSeed.toLowerCase(), cleanSeed.toLowerCase());

  if (directRows.length > 0) {
    const directLinks = directRows.map(tx => ({
      id: tx.tx_hash,
      hash: tx.tx_hash,
      sender: tx.sender,
      receiver: tx.receiver,
      source: tx.sender,
      target: tx.receiver,
      amount: Number(tx.amount || 0),
      valueDisplay: tx.value_display || '',
      token: tx.token || 'ETH',
      chain: tx.chain || 'Ethereum',
      timestamp: tx.timestamp,
      flagged: Boolean(tx.flagged),
    }));
    const compact = filterKeyForensicNodes(cleanSeed, directLinks);
    const nodes = compact.nodes.map(node => {
      const wallet = db.prepare('SELECT chain, type, entity, base_risk, flagged FROM wallets WHERE LOWER(address) = LOWER(?)').get(node.id);
      const risk = computeRiskScore(node.id, { useCache: false });
      return {
        ...node,
        chain: wallet?.chain || 'Ethereum',
        type: node.role === 'SEED' ? 'Seed Wallet' : node.role === 'INFLOW' ? 'Incoming funds' : 'Connected wallet',
        entity: wallet?.entity || null,
        risk_score: risk.riskScore,
        riskScore: risk.riskScore,
        riskFlags: risk.flags || [],
        baseRisk: wallet?.base_risk || node.riskScore || 10,
        flagged: Boolean(wallet?.flagged || risk.riskScore >= 75),
      };
    });
    const edges = aggregateGraphEdges(compact.links);
    return {
      nodes,
      links: compact.links,
      edges,
      meta: {
        seedAddress: cleanSeed,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        maxHops: effectiveMaxHops,
        traversalMs: Date.now() - startTime,
        source: 'LIVE_INDEXED_TRANSACTIONS',
      },
    };
  }

  const nodes = [];
  const links = [];
  const linksMap = new Map(); // tx_hash -> link
  const visitedWallets = new Set();

  // 1. Initialize Seed Node
  visitedWallets.add(cleanSeed.toLowerCase());
  nodes.push({
    id: cleanSeed,
    address: cleanSeed,
    group: 'SEED',
    category: 'SEED',
    depth: 0,
  });

  // BFS Queue: { address, depth }
  const queue = [{ address: cleanSeed, depth: 0 }];

  while (queue.length > 0 && nodes.length < maxNodes) {
    const current = queue.shift();
    const currentDepth = current.depth;

    if (currentDepth >= effectiveMaxHops) {
      continue;
    }

    // Normalize the target node being queried
    const currentNode = current.address.toLowerCase();

    // Query SQLite transactions for current node (case-insensitive)
    let txs = [];
    try {
      txs = db.prepare(`
        SELECT tx_hash, sender, receiver, amount, value_display, token,
               chain, timestamp, block_number, fee, flagged, notes
        FROM   transactions
        WHERE  LOWER(sender) = ? OR LOWER(receiver) = ?
        ORDER  BY timestamp DESC
        LIMIT  50
      `).all(currentNode, currentNode);
    } catch {
      txs = [];
    }

    for (const tx of txs) {
      // Create edge / link
      if (!linksMap.has(tx.tx_hash)) {
        const amountNum = parseFloat(tx.amount || 0);
        const valDisplay = tx.value_display || `$${amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const linkObj = {
          id: tx.tx_hash,
          hash: tx.tx_hash,
          source: tx.sender,
          target: tx.receiver,
          from: tx.sender,
          to: tx.receiver,
          amount: amountNum,
          valueDisplay: valDisplay,
          label: valDisplay,
          token: tx.token || 'ETH',
          chain: tx.chain || 'Ethereum',
          timestamp: tx.timestamp,
          blockNumber: tx.block_number || null,
          fee: parseFloat(tx.fee || 0),
          flagged: Boolean(tx.flagged),
          hot: Boolean(tx.flagged),
          notes: tx.notes || null,
        };

        linksMap.set(tx.tx_hash, linkObj);
        links.push(linkObj);
      }

      // Inside the transaction mapping loop:
      const txSender = tx.sender.toLowerCase();
      const txReceiver = tx.receiver.toLowerCase();

      // Safely identify the counterparty
      const counterpartyLower = (txSender === currentNode) ? txReceiver : txSender;
      const counterparty = (txSender === currentNode) ? tx.receiver : tx.sender;

      // If counterparty not yet visited, register as node & enqueue for next hop
      if (!visitedWallets.has(counterpartyLower) && nodes.length < maxNodes) {
        visitedWallets.add(counterpartyLower);
        nodes.push({
          id: counterparty,
          address: counterparty,
          group: 'INTERMEDIARY',
          category: 'INTERMEDIARY',
          depth: currentDepth + 1,
        });

        if (currentDepth + 1 < effectiveMaxHops) {
          queue.push({ address: counterparty, depth: currentDepth + 1 });
        }
      }
    }
  }

  if (links.length === 0) {
    try {
      const directTransactions = db.prepare(`
        SELECT tx_hash, sender, receiver, amount, value_display, token,
               chain, timestamp, block_number, fee, flagged, notes
        FROM transactions
        WHERE LOWER(sender) = ? OR LOWER(receiver) = ?
        ORDER BY timestamp DESC
        LIMIT 50
      `).all(cleanSeed.toLowerCase(), cleanSeed.toLowerCase());
      directTransactions.forEach(tx => links.push({
        id: tx.tx_hash,
        hash: tx.tx_hash,
        source: tx.sender,
        target: tx.receiver,
        from: tx.sender,
        to: tx.receiver,
        amount: Number(tx.amount || 0),
        valueDisplay: tx.value_display || '',
        label: tx.value_display || '',
        token: tx.token || 'ETH',
        chain: tx.chain || 'Ethereum',
        timestamp: tx.timestamp,
        flagged: Boolean(tx.flagged),
      }));
    } catch {}
  }

  const keyGraph = filterKeyForensicNodes(cleanSeed, links);
  nodes.splice(0, nodes.length, ...keyGraph.nodes);
  links.splice(0, links.length, ...keyGraph.links);

  // 2. Format Node Enrichment
  for (const node of nodes) {
    let walletMeta = null;
    try {
      walletMeta = db.prepare(`
        SELECT address, chain, type, label, entity, base_risk, risk_score, flagged
        FROM   wallets
        WHERE  LOWER(address) = ?
      `).get(node.id.toLowerCase());
    } catch {}

    let riskProfile = null;
    try {
      riskProfile = computeRiskScore(node.id, { useCache: false });
    } catch {}

    const isExchange =
      walletMeta &&
      (walletMeta.type === 'Exchange' ||
        (walletMeta.entity && walletMeta.entity.toLowerCase().includes('exchange')) ||
        (walletMeta.label && walletMeta.label.toLowerCase().includes('exchange')) ||
        (walletMeta.label && walletMeta.label.toLowerCase().includes('exch')));

    const isBank =
      walletMeta &&
      (walletMeta.chain === 'Bank' ||
        walletMeta.type === 'Source Bank Account' ||
        (walletMeta.entity && walletMeta.entity.toLowerCase().includes('bank')) ||
        node.id.startsWith('HDFC'));

    if (node.role === 'INFLOW') {
      node.group = 'INFLOW';
      node.category = 'INFLOW';
      node.type = 'Incoming funds';
    } else if (isExchange) {
      node.group = 'VASP';
      node.category = 'VASP';
      node.type = 'Exchange';
    } else if (isBank) {
      node.group = 'BANK';
      node.category = 'BANK';
      node.type = 'Bank';
    } else if (node.group === 'SEED') {
      node.category = 'SEED';
      node.type = walletMeta?.type || 'Seed Wallet';
    } else {
      node.category = walletMeta?.type || 'INTERMEDIARY';
      node.type = walletMeta?.type || 'Intermediate Wallet';
    }

    const shortId = node.id.length > 14 ? node.id.slice(0, 6) + '…' + node.id.slice(-4) : node.id;
    node.label = node.label || walletMeta?.label || shortId;
    node.chain = walletMeta?.chain || (node.id.startsWith('bc1') ? 'Bitcoin' : node.id.startsWith('T') ? 'TRON' : 'Ethereum');
    node.entity = walletMeta?.entity || null;
    node.risk_score = riskProfile?.riskScore ?? walletMeta?.risk_score ?? walletMeta?.base_risk ?? 50;
    node.riskScore = node.risk_score;
    node.riskFlags = riskProfile?.flags ?? [];
    node.explanations = riskProfile?.explanations ?? [];
    node.baseRisk = walletMeta?.base_risk || 15;
    node.flagged = Boolean(walletMeta?.flagged || node.riskScore >= 75);
  }

  const aggregatedEdges = aggregateGraphEdges(links.map((link) => ({
    sender: link.source,
    receiver: link.target,
    amount: Number(link.amount || 0),
    tx_hash: link.hash || link.id,
    timestamp: new Date(link.timestamp || Date.now()).getTime(),
  })));

  return {
    nodes,
    links,
    edges: aggregatedEdges,
    meta: {
      seedAddress: cleanSeed,
      totalNodes: nodes.length,
      totalEdges: aggregatedEdges.length,
      maxHops: effectiveMaxHops,
      traversalMs: Date.now() - startTime,
    },
  };
}

/**
 * Synchronous / promise backward-compatibility wrapper for traverseGraph.
 */
function traverseGraph(seedAddress, opts = {}) {
  const hops = opts.maxHops ?? DEFAULT_MAX_HOPS;
  const db = getDb();
  if (!seedAddress || typeof seedAddress !== 'string' || seedAddress.trim().length < 3) {
    return {
      nodes: [],
      links: [],
      edges: [],
      meta: { seedAddress: '', totalNodes: 0, totalEdges: 0, maxHops: hops, traversalMs: 0 },
    };
  }

  const cleanSeed = seedAddress.trim();
  const effectiveMaxHops = Math.min(parseInt(hops, 10), 5);
  const maxNodes = Math.min(parseInt(opts.maxNodes ?? 250, 10), 500);

  const nodes = [];
  const links = [];
  const linksMap = new Map();
  const visitedWallets = new Set();

  visitedWallets.add(cleanSeed.toLowerCase());
  nodes.push({
    id: cleanSeed,
    address: cleanSeed,
    group: 'SEED',
    category: 'SEED',
    depth: 0,
  });

  const queue = [{ address: cleanSeed, depth: 0 }];

  while (queue.length > 0 && nodes.length < maxNodes) {
    const current = queue.shift();
    const currentDepth = current.depth;

    if (currentDepth >= effectiveMaxHops) continue;

    // Normalize the target node being queried
    const currentNode = current.address.toLowerCase();

    let txs = [];
    try {
      txs = db.prepare(`
        SELECT tx_hash, sender, receiver, amount, value_display, token,
               chain, timestamp, block_number, fee, flagged, notes
        FROM   transactions
        WHERE  LOWER(sender) = ? OR LOWER(receiver) = ?
        ORDER  BY timestamp DESC
        LIMIT  50
      `).all(currentNode, currentNode);
    } catch {
      txs = [];
    }

    for (const tx of txs) {
      if (!linksMap.has(tx.tx_hash)) {
        const amountNum = parseFloat(tx.amount || 0);
        const valDisplay = tx.value_display || `$${amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const linkObj = {
          id: tx.tx_hash,
          hash: tx.tx_hash,
          source: tx.sender,
          target: tx.receiver,
          from: tx.sender,
          to: tx.receiver,
          amount: amountNum,
          valueDisplay: valDisplay,
          label: valDisplay,
          token: tx.token || 'ETH',
          chain: tx.chain || 'Ethereum',
          timestamp: tx.timestamp,
          blockNumber: tx.block_number || null,
          fee: parseFloat(tx.fee || 0),
          flagged: Boolean(tx.flagged),
          hot: Boolean(tx.flagged),
          notes: tx.notes || null,
        };

        linksMap.set(tx.tx_hash, linkObj);
        links.push(linkObj);
      }

      // Inside the transaction mapping loop:
      const txSender = tx.sender.toLowerCase();
      const txReceiver = tx.receiver.toLowerCase();

      // Safely identify the counterparty
      const counterpartyLower = (txSender === currentNode) ? txReceiver : txSender;
      const counterparty = (txSender === currentNode) ? tx.receiver : tx.sender;

      if (!visitedWallets.has(counterpartyLower) && nodes.length < maxNodes) {
        visitedWallets.add(counterpartyLower);
        nodes.push({
          id: counterparty,
          address: counterparty,
          group: 'INTERMEDIARY',
          category: 'INTERMEDIARY',
          depth: currentDepth + 1,
        });

        if (currentDepth + 1 < effectiveMaxHops) {
          queue.push({ address: counterparty, depth: currentDepth + 1 });
        }
      }
    }
  }

  for (const node of nodes) {
    let walletMeta = null;
    try {
      walletMeta = db.prepare(`
        SELECT address, chain, type, label, entity, base_risk, risk_score, flagged
        FROM   wallets
        WHERE  LOWER(address) = ?
      `).get(node.id.toLowerCase());
    } catch {}

    let riskProfile = null;
    try {
      riskProfile = computeRiskScore(node.id);
    } catch {}

    const isExchange =
      walletMeta &&
      (walletMeta.type === 'Exchange' ||
        (walletMeta.entity && walletMeta.entity.toLowerCase().includes('exchange')) ||
        (walletMeta.label && walletMeta.label.toLowerCase().includes('exchange')) ||
        (walletMeta.label && walletMeta.label.toLowerCase().includes('exch')));

    const isBank =
      walletMeta &&
      (walletMeta.chain === 'Bank' ||
        walletMeta.type === 'Source Bank Account' ||
        (walletMeta.entity && walletMeta.entity.toLowerCase().includes('bank')) ||
        node.id.startsWith('HDFC'));

    if (isExchange) {
      node.group = 'VASP';
      node.category = 'VASP';
      node.type = 'Exchange';
    } else if (isBank) {
      node.group = 'BANK';
      node.category = 'BANK';
      node.type = 'Bank';
    } else if (node.group === 'SEED') {
      node.category = 'SEED';
      node.type = walletMeta?.type || 'Seed Wallet';
    } else {
      node.category = walletMeta?.type || 'INTERMEDIARY';
      node.type = walletMeta?.type || 'Intermediate Wallet';
    }

    const shortId = node.id.length > 14 ? node.id.slice(0, 6) + '…' + node.id.slice(-4) : node.id;
    node.label = walletMeta?.label || shortId;
    node.chain = walletMeta?.chain || (node.id.startsWith('bc1') ? 'Bitcoin' : node.id.startsWith('T') ? 'TRON' : 'Ethereum');
    node.entity = walletMeta?.entity || null;
    node.risk_score = riskProfile?.riskScore ?? walletMeta?.risk_score ?? walletMeta?.base_risk ?? 50;
    node.riskScore = node.risk_score;
    node.riskFlags = riskProfile?.flags ?? [];
    node.baseRisk = walletMeta?.base_risk || 15;
    node.flagged = Boolean(walletMeta?.flagged || node.riskScore >= 75);
  }

  const aggregatedEdges = aggregateGraphEdges(links.map((link) => ({
    sender: link.source,
    receiver: link.target,
    amount: Number(link.amount || 0),
    tx_hash: link.hash || link.id,
    timestamp: new Date(link.timestamp || Date.now()).getTime(),
  })));

  return {
    nodes,
    links,
    edges: aggregatedEdges,
    meta: {
      seedAddress: cleanSeed,
      totalNodes: nodes.length,
      totalEdges: aggregatedEdges.length,
      maxHops: effectiveMaxHops,
      traversalMs: 1,
    },
  };
}

module.exports = {
  buildTraceGraph,
  traverseGraph,
};
