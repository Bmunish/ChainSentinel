'use strict';

const MIXERS = new Set([
  '0x722122df12d45044dd7917c805eb3a1f81014e7a',
  '0x47ce0c61d0e0f0e5f663cfd50805506c3a0120b1',
  '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf',
  '0xa160cdab225685da1d56aa342ad8841c3b53f291',
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
]);

const BRIDGES = new Set([
  '0x280e4d75a1aa087967480848d536a73653aa0508',
  '0x4d9079bb4165aeb4084c526a32695dcfd2f77381',
  '0x5c7d92366f4c17b40677c3f917da06f225a4245b',
]);

function normalizeTx(tx) {
  return {
    sender: String(tx.sender || '').toLowerCase(),
    receiver: String(tx.receiver || '').toLowerCase(),
    amount: Number(tx.amount || 0),
    timestamp: Number(tx.timestamp || Date.now()),
    tx_hash: String(tx.tx_hash || tx.hash || '').toLowerCase(),
    method: String(tx.method_name || tx.method || 'transfer').toLowerCase(),
  };
}

function calculateRiskScore(walletCategory, behaviours = [], counterparties = []) {
  const baseMap = {
    SEED_WALLET: 40,
    MIXER_POOL: 100,
    SANCTIONED_ENTITY: 100,
    TRANSIT_INTERMEDIARY: 25,
    REGULATED_VASP: 20,
    UNLABELED_WALLET: 10,
  };

  const baseScore = baseMap[walletCategory] || 10;
  const factors = [{ name: `Base Profile: ${walletCategory}`, points: baseScore }];
  const penaltyTotal = behaviours.reduce((sum, behaviour) => {
    const points = Number(behaviour.penalty) || 0;
    factors.push({ name: behaviour.rule, points, reason: behaviour.reason });
    return sum + points;
  }, 0);
  const normalizedCounterparties = counterparties.map(counterparty => String(counterparty.category || counterparty.type || '').toUpperCase());
  let counterpartyScore = 0;
  if (normalizedCounterparties.includes('MIXER_POOL') || normalizedCounterparties.includes('MIXER')) {
    counterpartyScore += 45;
    factors.push({ name: 'INDIRECT_MIXER_EXPOSURE', points: 45, reason: 'Transacted with a known mixer pool' });
  }
  if (normalizedCounterparties.includes('DARKNET')) {
    counterpartyScore += 40;
    factors.push({ name: 'DARKNET_EXPOSURE', points: 40, reason: 'Exposure to a darknet marketplace' });
  }
  const rawScore = baseScore + penaltyTotal + counterpartyScore;
  const finalScore = Math.min(100, Math.max(0, rawScore));

  let level = 'LOW';
  if (finalScore >= 86) level = 'CRITICAL';
  else if (finalScore >= 71) level = 'HIGH';
  else if (finalScore >= 31) level = 'MEDIUM';

  return {
    score: finalScore,
    level,
    baseScore,
    factors,
  };
}

function evaluateLiveBehaviours(walletAddress, transactions = []) {
  const target = String(walletAddress || '').toLowerCase();
  const normalized = (transactions || []).map(normalizeTx).filter((tx) => tx.sender || tx.receiver);
  const outTxs = normalized.filter((tx) => tx.sender === target).sort((a, b) => a.timestamp - b.timestamp);
  const inTxs = normalized.filter((tx) => tx.receiver === target).sort((a, b) => a.timestamp - b.timestamp);
  const detected = [];

  const hitsMixer = normalized.some((tx) => MIXERS.has(tx.sender) || MIXERS.has(tx.receiver));
  if (hitsMixer) {
    detected.push({
      rule: 'MIXER_INTERACTION',
      severity: 'CRITICAL',
      penalty: 30,
      reason: 'Direct interaction with Tornado Cash mixing contract',
    });
  }

  const hitsBridge = normalized.some((tx) => BRIDGES.has(tx.sender) || BRIDGES.has(tx.receiver));
  if (hitsBridge) {
    detected.push({
      rule: 'CHAIN_HOPPING',
      severity: 'MEDIUM',
      penalty: 15,
      reason: 'Funds routed into cross-chain liquidity bridge',
    });
  }

  for (let i = 0; i < outTxs.length; i += 1) {
    const windowEnd = outTxs[i].timestamp + (10 * 60 * 1000);
    const windowTxs = outTxs.slice(i).filter((tx) => tx.timestamp <= windowEnd);
    const uniqueRecipients = new Set(windowTxs.map((tx) => tx.receiver));
    if (uniqueRecipients.size >= 3) {
      detected.push({
        rule: 'RAPID_FAN_OUT',
        severity: 'HIGH',
        penalty: 25,
        reason: `Dispersed funds to ${uniqueRecipients.size} unique recipients in < 10 minutes`,
      });
      break;
    }
  }

  for (let i = 0; i < outTxs.length; i += 1) {
    const windowEnd = outTxs[i].timestamp + (60 * 60 * 1000);
    const sumOutflow = outTxs.slice(i)
      .filter((tx) => tx.timestamp <= windowEnd)
      .reduce((acc, curr) => acc + curr.amount, 0);

    if (sumOutflow >= 15.0) {
      detected.push({
        rule: 'HIGH_VELOCITY',
        severity: 'HIGH',
        penalty: 20,
        reason: `Rapid outflow velocity: ${sumOutflow.toFixed(2)} ETH drained within 1 hour`,
      });
      break;
    }
  }

  if (inTxs.length > 0 && outTxs.length > 0) {
    for (const inTx of inTxs) {
      const matchOut = outTxs.find((outTx) => outTx.timestamp >= inTx.timestamp && outTx.timestamp <= inTx.timestamp + (5 * 60 * 1000));
      if (matchOut && matchOut.amount >= inTx.amount * 0.95 && inTx.amount > 0.1) {
        detected.push({
          rule: 'IMMEDIATE_FORWARDING',
          severity: 'HIGH',
          penalty: 15,
          reason: `Hot Transit: ${matchOut.amount} ETH forwarded out in under 5 minutes from deposit`,
        });
        break;
      }
    }
  }

  if (normalized.length >= 2) {
    const sortedAll = [...normalized].sort((a, b) => a.timestamp - b.timestamp);
    for (let k = 1; k < sortedAll.length; k += 1) {
      const gapDays = (sortedAll[k].timestamp - sortedAll[k - 1].timestamp) / (1000 * 60 * 60 * 24);
      if (gapDays >= 30 && sortedAll[k].receiver === target && sortedAll[k].amount >= 5.0) {
        detected.push({
          rule: 'DORMANT_REACTIVATION',
          severity: 'MEDIUM',
          penalty: 10,
          reason: `Reactivated after ${Math.round(gapDays)} days of dormancy with ${sortedAll[k].amount} ETH inflow`,
        });
        break;
      }
    }
  }

  return detected;
}

function aggregateGraphEdges(transactions = []) {
  const edgeMap = new Map();

  for (const tx of transactions) {
    const source = String(tx.sender || '').trim();
    const target = String(tx.receiver || '').trim();
    if (!source || !target) continue;

    const key = `${source}->${target}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        source,
        target,
        amount: Number(tx.amount || 0),
        count: 1,
        hashes: [String(tx.tx_hash || '').trim()].filter(Boolean),
      });
    } else {
      const existing = edgeMap.get(key);
      existing.amount = parseFloat((existing.amount + Number(tx.amount || 0)).toFixed(4));
      existing.count += 1;
      const hash = String(tx.tx_hash || '').trim();
      if (hash) existing.hashes.push(hash);
    }
  }

  return Array.from(edgeMap.values()).map((edge) => ({
    source: edge.source,
    target: edge.target,
    label: edge.amount > 0 ? `${edge.amount} ETH (${edge.count} txs)` : `${edge.count} calls ($0.00)`,
    amount: edge.amount,
    count: edge.count,
  }));
}

module.exports = {
  calculateRiskScore,
  evaluateLiveBehaviours,
  aggregateGraphEdges,
  MIXERS,
  BRIDGES,
};
