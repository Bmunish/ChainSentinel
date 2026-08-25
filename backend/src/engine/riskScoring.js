'use strict';

/**
 * riskScoring.js
 * ──────────────────────────────────────────────────────────────────────────
 * Behavioural Risk Engine for ChainSentinel.
 *
 * Computes a dynamic risk score (0–100) for any wallet address by analysing
 * its on-chain transaction history. Detects five distinct threat behaviours:
 *
 *  1. Rapid Fan-Out       — funds split to N+ receivers within a short window
 *  2. High Velocity       — abnormally large volume in a short time window
 *  3. Mixer Interaction   — direct link to a known mixing service
 *  4. Chain Hopping       — cross-chain activity (layering technique)
 *  5. Dormant Reactivation— sudden activity after a long dormancy period
 *
 * Formula: riskScore = clamp(base_risk + Σ penalties, 0, 100)
 * ──────────────────────────────────────────────────────────────────────────
 */

const { getDb } = require('../db/database');

// ── Thresholds (overridable via ENV) ────────────────────────────────────────
const CFG = {
  FAN_OUT_MIN_RECEIVERS:    parseInt(process.env.FAN_OUT_MIN_RECEIVERS    || '3',   10),
  FAN_OUT_WINDOW_MINUTES:   parseInt(process.env.FAN_OUT_WINDOW_MINUTES   || '10',  10),
  VELOCITY_THRESHOLD_USD:   parseFloat(process.env.VELOCITY_THRESHOLD_USD || '50000'),
  VELOCITY_WINDOW_HOURS:    parseInt(process.env.VELOCITY_WINDOW_HOURS    || '1',   10),
  DORMANT_DAYS_THRESHOLD:   parseInt(process.env.DORMANT_DAYS_THRESHOLD   || '30',  10),
};

// ── Score Penalties ─────────────────────────────────────────────────────────
const PENALTIES = {
  RAPID_FAN_OUT:          25,
  HIGH_VELOCITY:          20,
  MIXER_INTERACTION:      30,
  CHAIN_HOPPING:          15,
  DORMANT_REACTIVATION:   10,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a datetime string to epoch milliseconds */
function toMs(datetimeStr) {
  return new Date(datetimeStr).getTime();
}

/** Clamp a value within [min, max] */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Slide a fixed-width time window across an array of {timestamp, amount}
 * records and find the maximum aggregated amount within any single window.
 *
 * @param {Array<{timestamp: string, amount: number}>} txs  - sorted ascending
 * @param {number} windowMs  - window size in milliseconds
 * @returns {number}  - maximum amount observed in any window
 */
function maxWindowVolume(txs, windowMs) {
  if (!txs.length) return 0;
  let maxVol = 0;
  let windowStart = 0;
  let runningSum  = 0;

  for (let i = 0; i < txs.length; i++) {
    runningSum += txs[i].amount;
    const tI = toMs(txs[i].timestamp);

    // Shrink window from the left while it exceeds the window size
    while (tI - toMs(txs[windowStart].timestamp) > windowMs) {
      runningSum -= txs[windowStart].amount;
      windowStart++;
    }

    if (runningSum > maxVol) maxVol = runningSum;
  }
  return maxVol;
}

// ── Individual Behaviour Detectors ───────────────────────────────────────────

/**
 * DETECTOR 1: Rapid Fan-Out
 * Triggered when a wallet sends funds to ≥N unique receivers within M minutes.
 * Classic smurfing / structuring indicator.
 */
function detectRapidFanOut(db, address) {
  const windowMs = CFG.FAN_OUT_WINDOW_MINUTES * 60 * 1000;

  const outgoing = db.prepare(`
    SELECT receiver, timestamp
    FROM   transactions
    WHERE  sender = ?
    ORDER  BY timestamp ASC
  `).all(address);

  if (outgoing.length < CFG.FAN_OUT_MIN_RECEIVERS) return false;

  // Sliding window: find any window where ≥N unique receivers appear
  for (let i = 0; i < outgoing.length; i++) {
    const tStart = toMs(outgoing[i].timestamp);
    const receivers = new Set();

    for (let j = i; j < outgoing.length; j++) {
      if (toMs(outgoing[j].timestamp) - tStart > windowMs) break;
      receivers.add(outgoing[j].receiver);
    }

    if (receivers.size >= CFG.FAN_OUT_MIN_RECEIVERS) return true;
  }
  return false;
}

/**
 * DETECTOR 2: High Velocity
 * Triggered when total outgoing volume exceeds $THRESHOLD in any 1-hour window.
 */
function detectHighVelocity(db, address) {
  const windowMs = CFG.VELOCITY_WINDOW_HOURS * 60 * 60 * 1000;

  const outgoing = db.prepare(`
    SELECT timestamp, amount
    FROM   transactions
    WHERE  sender = ?
    ORDER  BY timestamp ASC
  `).all(address);

  const maxVol = maxWindowVolume(outgoing, windowMs);
  return maxVol >= CFG.VELOCITY_THRESHOLD_USD;
}

/**
 * DETECTOR 3: Mixer Interaction
 * Triggered when the wallet has a direct transaction to/from a Mixer wallet.
 */
function detectMixerInteraction(db, address) {
  const result = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM   transactions t
    JOIN   wallets      w ON (w.address = t.receiver OR w.address = t.sender)
    WHERE  w.type = 'Mixer'
      AND  w.address != ?
      AND  (t.sender = ? OR t.receiver = ?)
    LIMIT  1
  `).get(address, address, address);

  return result && result.cnt > 0;
}

/**
 * DETECTOR 4: Chain Hopping
 * Triggered when the wallet's transactions span ≥2 different blockchain networks.
 * (Inferred from the wallets connected to this address.)
 */
function detectChainHopping(db, address) {
  // Collect all unique chains of directly-connected counterparty wallets
  const result = db.prepare(`
    SELECT COUNT(DISTINCT w.chain) AS chain_count
    FROM   transactions t
    JOIN   wallets      w ON (
             (t.sender = ? AND w.address = t.receiver)
          OR (t.receiver = ? AND w.address = t.sender)
           )
  `).get(address, address);

  return result && result.chain_count >= 2;
}

/**
 * DETECTOR 5: Dormant Reactivation
 * Triggered when there is a gap of >N days in activity followed by a burst.
 * A "burst" = ≥3 transactions within 24h after the gap.
 */
function detectDormantReactivation(db, address) {
  const dormantMs  = CFG.DORMANT_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;
  const burstCount = 3;
  const burstMs    = 24 * 60 * 60 * 1000;

  const allTxs = db.prepare(`
    SELECT timestamp
    FROM   transactions
    WHERE  sender = ? OR receiver = ?
    ORDER  BY timestamp ASC
  `).all(address, address);

  if (allTxs.length < burstCount + 1) return false;

  for (let i = 1; i < allTxs.length; i++) {
    const gap = toMs(allTxs[i].timestamp) - toMs(allTxs[i - 1].timestamp);
    if (gap >= dormantMs) {
      // Check if there's a burst after this gap
      const burstStart = toMs(allTxs[i].timestamp);
      let count = 0;
      for (let k = i; k < allTxs.length; k++) {
        if (toMs(allTxs[k].timestamp) - burstStart <= burstMs) {
          count++;
        } else {
          break;
        }
      }
      if (count >= burstCount) return true;
    }
  }
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Computes the full risk profile for a wallet address.
 *
 * @param {string} address
 * @param {{ useCache?: boolean }} [options]
 * @returns {{
 *   address: string,
 *   riskScore: number,
 *   baseRisk: number,
 *   flags: string[],
 *   penalties: Record<string,number>,
 *   computedAt: string
 * }}
 */
function computeRiskScore(address, options = {}) {
  const db = getDb();
  const { useCache = true } = options;

  // Check cache first
  if (useCache) {
    const cached = db.prepare(`
      SELECT risk_score, flags, computed_at
      FROM   risk_cache
      WHERE  address = ?
        AND  computed_at > datetime('now', '-5 minutes')
    `).get(address);

    if (cached) {
      return {
        address,
        riskScore:   cached.risk_score,
        baseRisk:    null,
        flags:       JSON.parse(cached.flags),
        penalties:   null,
        computedAt:  cached.computed_at,
        fromCache:   true,
      };
    }
  }

  // Fetch wallet base risk
  const wallet = db.prepare(`
    SELECT base_risk FROM wallets WHERE address = ?
  `).get(address);

  const baseRisk = wallet ? wallet.base_risk : 0;

  // Run all detectors
  const detectedFlags   = [];
  const appliedPenalties = {};
  let   bonusScore      = 0;

  const checks = [
    { key: 'RAPID_FAN_OUT',         label: 'Rapid Fan-Out',          fn: detectRapidFanOut         },
    { key: 'HIGH_VELOCITY',         label: 'High Velocity',          fn: detectHighVelocity         },
    { key: 'MIXER_INTERACTION',     label: 'Mixer Interaction',      fn: detectMixerInteraction     },
    { key: 'CHAIN_HOPPING',         label: 'Chain Hopping',          fn: detectChainHopping         },
    { key: 'DORMANT_REACTIVATION',  label: 'Dormant Reactivation',   fn: detectDormantReactivation  },
  ];

  for (const check of checks) {
    if (check.fn(db, address)) {
      detectedFlags.push(check.label);
      appliedPenalties[check.key] = PENALTIES[check.key];
      bonusScore += PENALTIES[check.key];
    }
  }

  const riskScore = clamp(baseRisk + bonusScore, 0, 100);
  const computedAt = new Date().toISOString();

  // Upsert into cache
  db.prepare(`
    INSERT INTO risk_cache (address, risk_score, flags, computed_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET
      risk_score  = excluded.risk_score,
      flags       = excluded.flags,
      computed_at = excluded.computed_at
  `).run(address, riskScore, JSON.stringify(detectedFlags), computedAt);

  return {
    address,
    riskScore,
    baseRisk,
    flags:     detectedFlags,
    penalties: appliedPenalties,
    computedAt,
    fromCache: false,
  };
}

/**
 * Batch-computes risk scores for multiple addresses.
 * @param {string[]} addresses
 * @returns {Map<string, ReturnType<computeRiskScore>>}
 */
function batchComputeRisk(addresses) {
  const results = new Map();
  for (const addr of addresses) {
    results.set(addr, computeRiskScore(addr));
  }
  return results;
}

module.exports = {
  computeRiskScore,
  batchComputeRisk,
  // Export detectors individually for unit testing
  detectRapidFanOut,
  detectHighVelocity,
  detectMixerInteraction,
  detectChainHopping,
  detectDormantReactivation,
  CFG,
  PENALTIES,
};
