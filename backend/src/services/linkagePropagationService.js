'use strict';

/**
 * linkagePropagationService.js
 * ──────────────────────────────────────────────────────────────────────────
 * Autonomous Multi-Hop Linkage Propagation Engine for ChainTrace.
 *
 * Traverses on-chain transaction paths up to 2 hops deep starting from a suspect
 * seed address, ingests verified transactions and wallet entities into SQLite,
 * re-evaluates behavioural risk rules dynamically, and updates investigation graph records.
 * ──────────────────────────────────────────────────────────────────────────
 */

const { getDb } = require('../db/database');
const { fetchOnChainTransactions, detectChain } = require('../blockchain');
const { computeRiskScore } = require('../engine/riskScoring');
const { analyzeBehaviours } = require('../engine/behaviourEngine');
const { calculateRiskScore, evaluateLiveBehaviours } = require('./liveRiskEngine');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getCounterparties(db, address) {
  const rows = db.prepare(`
    SELECT DISTINCT
      CASE WHEN LOWER(sender) = LOWER(?) THEN receiver ELSE sender END AS address
    FROM transactions
    WHERE LOWER(sender) = LOWER(?) OR LOWER(receiver) = LOWER(?)
  `).all(address, address, address);

  return rows.map(row => {
    const wallet = db.prepare('SELECT type, entity, label FROM wallets WHERE LOWER(address) = LOWER(?)').get(row.address);
    const descriptor = `${wallet?.type || ''} ${wallet?.entity || ''} ${wallet?.label || ''}`.toUpperCase();
    return {
      address: row.address,
      category: descriptor.includes('MIXER') ? 'MIXER_POOL' : descriptor.includes('DARKNET') ? 'DARKNET' : wallet?.type || 'UNLABELED_WALLET',
    };
  });
}

function updateWalletRiskProfile(address, category, behaviours = [], counterparties = [], caseId = null) {
  const db = getDb();
  const riskProfile = calculateRiskScore(category, behaviours, counterparties);
  const cleanAddress = String(address || '').trim().toLowerCase();
  const riskLevel = riskProfile.level;

  db.prepare(`
    UPDATE wallets
    SET risk_score = ?, risk_level = ?, updated_at = datetime('now')
    WHERE LOWER(address) = ?
  `).run(riskProfile.score, riskLevel, cleanAddress);

  if (riskProfile.score >= 71 && caseId) {
    db.prepare(`
      INSERT INTO alerts (id, case_id, wallet_address, alert_type, level, title, description, risk_score, indicators)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ALT-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      caseId,
      cleanAddress,
      'RISK_SCORE_THRESHOLD',
      riskLevel,
      `Suspicious Activity Detected: Risk Score ${riskProfile.score}`,
      'FATF-aligned additive risk evaluation exceeded the high-risk threshold.',
      riskProfile.score,
      JSON.stringify(riskProfile.factors),
    );
  }

  return { ...riskProfile, address: cleanAddress, riskScore: riskProfile.score, riskLevel };
}

/**
 * Checks whether an address is a short demo/synthetic placeholder.
 */
function isDemoAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return address.includes('...') || address.startsWith('0xFRAUD_');
}

/**
 * Propagates on-chain transaction linkage up to maxHops from seed address.
 *
 * @param {string} caseNumber - Investigation Case ID (e.g., CS-2026-001)
 * @param {string} seedAddress - Suspect seed address
 * @param {string} chain - Detected chain (ETHEREUM | BITCOIN | BNB_CHAIN | TRON)
 * @param {number} maxHops - Default: 2
 * @param {number} maxTotalTx - Default: 30
 * @returns {Promise<{
 *   success: boolean,
 *   caseNumber: string,
 *   seedAddress: string,
 *   hopsProcessed: number,
 *   totalTransactionsIngested: number,
 *   totalWalletsDiscovered: number,
 *   maxHopReached: number,
 *   riskScore: number,
 *   riskLevel: string
 * }>}
 */
async function propagateLinkage(caseNumber, seedAddress, chain = null, maxHops = 2, maxTotalTx = 30) {
  if (!seedAddress || typeof seedAddress !== 'string') {
    return {
      success: false,
      reason: 'Invalid seed address',
      totalTransactionsIngested: 0,
      totalWalletsDiscovered: 0,
    };
  }

  const cleanSeed = seedAddress.trim();
  const activeChain = chain || detectChain(cleanSeed);
  const db = getDb();
  const isDemo = isDemoAddress(cleanSeed);

  const visitedAddresses = new Set();
  const discoveredWallets = new Set([cleanSeed.toLowerCase()]);
  const queue = [{ address: cleanSeed, hop: 0 }];
  let totalTxIngested = 0;
  let maxHopReached = 0;

  // Ensure seed wallet exists in DB with appropriate base risk
  const seedBaseRisk = isDemo ? 85 : 40;
  _upsertWallet(db, cleanSeed, activeChain, 'Seed Wallet', isDemo ? 'Investigation Seed' : 'Target Address', seedBaseRisk, isDemo ? 1 : 0);

  // Enforce strict upper bound on hops and total transactions
  const effectiveMaxHops = Math.min(maxHops || 2, 2);
  const effectiveMaxTx = Math.min(maxTotalTx || 30, 50);

  while (queue.length > 0 && totalTxIngested < effectiveMaxTx) {
    const current = queue.shift();
    const currentAddress = current.address;
    const currentHop = current.hop;

    if (visitedAddresses.has(currentAddress.toLowerCase())) {
      continue;
    }
    visitedAddresses.add(currentAddress.toLowerCase());
    if (currentHop > maxHopReached) {
      maxHopReached = currentHop;
    }

    // Rate-limiting throttle to avoid 429 errors from public RPC/Explorers
    if (visitedAddresses.size > 1) {
      await sleep(250);
    }

    let txList = [];
    try {
      console.log(`[NETWORK] Fetching live data for: ${currentAddress} (${activeChain}) ...`);
      txList = await fetchOnChainTransactions(currentAddress, activeChain, { limit: 20 });
      console.log(`[NETWORK] Success! Retrieved ${txList.length} txs for ${currentAddress}`);
    } catch (fetchErr) {
      console.error(`[NETWORK ERROR] Failed to fetch on-chain data for ${currentAddress}:`, fetchErr.message);
      txList = [];
    }

    if (!Array.isArray(txList) || txList.length === 0) {
      continue;
    }

    for (const tx of txList) {
      if (totalTxIngested >= effectiveMaxTx) break;

      const senderAddr = (tx.sender || currentAddress).trim();
      const receiverAddr = (tx.receiver || '0x0000000000000000000000000000000000000000').trim();
      const txChain = tx.chain || activeChain;

      discoveredWallets.add(senderAddr.toLowerCase());
      discoveredWallets.add(receiverAddr.toLowerCase());

      const txBehavior = evaluateLiveBehaviours(cleanSeed, txList);
      const liveRisk = calculateRiskScore('SEED_WALLET', txBehavior);
      const liveRiskScore = liveRisk.score;

      // 1. Foreign Key Safety: Upsert both wallets before inserting transaction
      const isSenderSeed = senderAddr.toLowerCase() === cleanSeed.toLowerCase();
      const isReceiverSeed = receiverAddr.toLowerCase() === cleanSeed.toLowerCase();

      const senderType = isSenderSeed ? 'Seed Wallet' : currentHop === 0 ? 'Transfer Wallet' : 'Intermediate Wallet';
      const receiverType = isReceiverSeed ? 'Seed Wallet' : currentHop === 0 ? 'Intermediate Wallet' : 'Linked Wallet';

      const defaultNodeRisk = isDemo ? 50 : 10;
      _upsertWallet(db, senderAddr, txChain, senderType, `Node Hop-${currentHop}`, isSenderSeed ? seedBaseRisk : defaultNodeRisk, isSenderSeed ? 1 : 0);
      _upsertWallet(db, receiverAddr, txChain, receiverType, `Node Hop-${currentHop + 1}`, isReceiverSeed ? seedBaseRisk : defaultNodeRisk, isReceiverSeed ? 1 : 0);

      if (isSenderSeed || isReceiverSeed) {
        const seedWallet = db.prepare('SELECT * FROM wallets WHERE LOWER(address) = ?').get(cleanSeed.toLowerCase());
        if (seedWallet) {
          db.prepare("UPDATE wallets SET base_risk = ?, type = ?, label = ?, risk_level = ?, risk_score = ?, updated_at = datetime('now') WHERE LOWER(address) = ?")
            .run(40, 'Seed Wallet', 'Target Address', 'HIGH', Math.max(seedWallet.risk_score || 0, 40), cleanSeed.toLowerCase());
        }
      }

      // 2. Insert or replace transaction
      try {
        const valueDisplay = tx.value_display || `$${Number(tx.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        const timestampIso = tx.timestamp || new Date().toISOString();

        db.prepare(`
          INSERT INTO transactions (
            tx_hash, sender, receiver, amount, value_display, token, chain,
            timestamp, block_number, fee, flagged, provenance, case_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OBSERVED', ?)
          ON CONFLICT(tx_hash) DO UPDATE SET
            case_id = excluded.case_id,
            provenance = 'OBSERVED'
        `).run(
          tx.tx_hash,
          senderAddr,
          receiverAddr,
          parseFloat(tx.amount || 0),
          valueDisplay,
          tx.token_symbol || tx.token || 'ETH',
          txChain,
          timestampIso,
          tx.block_number || 0,
          parseFloat(tx.fee || 0),
          tx.flagged || 0,
          caseNumber || 'CS-2026-001'
        );

        totalTxIngested++;
      } catch (err) {
        // Continue if single tx insert encounters transient conflict
      }

      // 3. Queue next hop counterparties if within maxHops
      if (currentHop + 1 <= effectiveMaxHops) {
        const counterparty = senderAddr.toLowerCase() === currentAddress.toLowerCase() ? receiverAddr : senderAddr;
        if (
          counterparty &&
          !counterparty.startsWith('0x0000000000000000000000000000000000000000') &&
          !counterparty.includes('unknown') &&
          !visitedAddresses.has(counterparty.toLowerCase())
        ) {
          queue.push({ address: counterparty, hop: currentHop + 1 });
        }
      }
    }
  }

  // 4. Post-propagation: Re-evaluate dynamic risk score and behaviours
  let updatedRiskScore = seedBaseRisk;
  let updatedRiskLevel = 'LOW';
  let finalRisk = { score: updatedRiskScore, level: updatedRiskLevel, factors: [] };

  try {
    const liveTxs = db.prepare(`
      SELECT sender, receiver, amount, value_display, token, chain, timestamp, block_number, fee, flagged, tx_hash
      FROM transactions
      WHERE LOWER(sender) = ? OR LOWER(receiver) = ?
      ORDER BY timestamp DESC
    `).all(cleanSeed.toLowerCase(), cleanSeed.toLowerCase());

    const liveBehaviours = evaluateLiveBehaviours(cleanSeed, liveTxs);
    const counterparties = getCounterparties(db, cleanSeed);
    finalRisk = updateWalletRiskProfile(cleanSeed, 'SEED_WALLET', liveBehaviours, counterparties, caseNumber);
    updatedRiskScore = finalRisk.score;
    updatedRiskLevel = finalRisk.level;

    const riskResult = computeRiskScore(cleanSeed, { useCache: false });
    if (riskResult && typeof riskResult.riskScore === 'number' && riskResult.riskScore > updatedRiskScore) {
      updatedRiskScore = riskResult.riskScore;
      updatedRiskLevel =
        updatedRiskScore >= 90 ? 'CRITICAL' : updatedRiskScore >= 75 ? 'HIGH' : updatedRiskScore >= 50 ? 'MEDIUM' : 'LOW';
    }
  } catch {}

  // Trigger behaviour engine
  try {
    analyzeBehaviours(caseNumber || cleanSeed);
  } catch {}

  // 5. Update investigation record with new metrics
  if (caseNumber) {
    try {
      db.prepare(`
        UPDATE investigations
        SET risk_score = ?, risk_level = ?, updated_at = datetime('now')
        WHERE case_id = ?
      `).run(updatedRiskScore, updatedRiskLevel, caseNumber);

      const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const nowDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      db.prepare(`
        INSERT INTO timeline_events (case_id, time, date, event, detail, source, dot, ref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        caseNumber,
        nowTime,
        nowDate,
        `On-chain graph propagated (${maxHopReached} hops)`,
        `Autonomous ingestion: ${totalTxIngested} transactions and ${discoveredWallets.size} wallet entities verified across ${activeChain}. Risk evaluated: ${updatedRiskScore}/100 (${updatedRiskLevel}).`,
        'Blockchain Intake Engine',
        updatedRiskScore >= 75 ? 'red' : updatedRiskScore >= 50 ? 'orange' : 'green',
        cleanSeed
      );
    } catch {}
  }

  return {
    success: true,
    caseNumber,
    seedAddress: cleanSeed,
    hopsProcessed: maxHopReached,
    totalTransactionsIngested: totalTxIngested,
    totalWalletsDiscovered: discoveredWallets.size,
    maxHopReached,
    riskScore: updatedRiskScore,
    riskLevel: updatedRiskLevel,
    factors: finalRisk?.factors || [],
  };
}

/**
 * Helper to safely insert wallet record if not exists.
 */
function _upsertWallet(db, address, chain, type, label, baseRisk, flagged) {
  try {
    const existing = db.prepare('SELECT address FROM wallets WHERE address = ?').get(address);
    if (!existing) {
      db.prepare(`
        INSERT INTO wallets (address, chain, type, label, base_risk, flagged)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(address, chain || 'Ethereum', type || 'Unknown', label || 'Discovered Node', baseRisk || 15, flagged || 0);
    }
  } catch {}
}

module.exports = {
  propagateLinkage,
  updateWalletRiskProfile,
};
