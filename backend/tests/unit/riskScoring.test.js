'use strict';

/**
 * riskScoring.test.js
 * Unit tests for the Behavioural Risk Engine.
 * Uses an in-memory SQLite database for isolation.
 */

process.env.NODE_ENV = 'test';
process.env.DB_PATH  = ':memory:';

const {
  computeRiskScore,
  detectRapidFanOut,
  detectHighVelocity,
  detectMixerInteraction,
  detectChainHopping,
  detectDormantReactivation,
  PENALTIES,
} = require('../../src/engine/riskScoring');

const { getDb, resetDb } = require('../../src/db/database');
const { v4: uuidv4 }    = require('uuid');

// ── Helpers ───────────────────────────────────────────────────────────────────

function insertWallet(db, address, type = 'EOA', chain = 'ETH', baseRisk = 0) {
  db.prepare(`
    INSERT OR IGNORE INTO wallets (address, chain, type, base_risk)
    VALUES (?, ?, ?, ?)
  `).run(address, chain, type, baseRisk);
}

function insertTx(db, sender, receiver, amount, token, timestampISO) {
  db.prepare(`
    INSERT INTO transactions (tx_hash, sender, receiver, amount, token, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('0x' + uuidv4().replace(/-/g, ''), sender, receiver, amount, token, timestampISO);
}

function minutesAgo(n) {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  resetDb();
});

afterAll(() => {
  const { closeDb } = require('../../src/db/database');
  closeDb();
});

// ── Tests: detectRapidFanOut ──────────────────────────────────────────────────

describe('detectRapidFanOut', () => {
  test('returns true when ≥3 unique receivers within 10 minutes', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV_A');
    insertWallet(db, 'RECV_B');
    insertWallet(db, 'RECV_C');

    insertTx(db, 'ORIGIN', 'RECV_A', 1000, 'ETH', minutesAgo(8));
    insertTx(db, 'ORIGIN', 'RECV_B', 2000, 'ETH', minutesAgo(6));
    insertTx(db, 'ORIGIN', 'RECV_C', 1500, 'ETH', minutesAgo(4));

    expect(detectRapidFanOut(db, 'ORIGIN')).toBe(true);
  });

  test('returns false when receivers are spread over more than 10 minutes', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV_A');
    insertWallet(db, 'RECV_B');
    insertWallet(db, 'RECV_C');

    insertTx(db, 'ORIGIN', 'RECV_A', 1000, 'ETH', minutesAgo(30));
    insertTx(db, 'ORIGIN', 'RECV_B', 2000, 'ETH', minutesAgo(20));
    insertTx(db, 'ORIGIN', 'RECV_C', 1500, 'ETH', minutesAgo(10));

    expect(detectRapidFanOut(db, 'ORIGIN')).toBe(false);
  });

  test('returns false with only 2 unique receivers in window', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV_A');
    insertWallet(db, 'RECV_B');

    insertTx(db, 'ORIGIN', 'RECV_A', 1000, 'ETH', minutesAgo(5));
    insertTx(db, 'ORIGIN', 'RECV_B', 2000, 'ETH', minutesAgo(3));

    expect(detectRapidFanOut(db, 'ORIGIN')).toBe(false);
  });

  test('counts each unique receiver only once even with multiple txs to same address', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV_A');
    insertWallet(db, 'RECV_B');

    // 5 transactions but only 2 unique receivers
    for (let i = 0; i < 3; i++) {
      insertTx(db, 'ORIGIN', 'RECV_A', 1000, 'ETH', minutesAgo(5 - i));
    }
    for (let i = 0; i < 2; i++) {
      insertTx(db, 'ORIGIN', 'RECV_B', 2000, 'ETH', minutesAgo(3 - i));
    }

    expect(detectRapidFanOut(db, 'ORIGIN')).toBe(false);
  });
});

// ── Tests: detectHighVelocity ─────────────────────────────────────────────────

describe('detectHighVelocity', () => {
  test('returns true when total outgoing exceeds $50,000 in 1 hour', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV_A');

    // $55,000 total within 50 minutes
    insertTx(db, 'ORIGIN', 'RECV_A', 20000, 'ETH', minutesAgo(50));
    insertTx(db, 'ORIGIN', 'RECV_A', 20000, 'ETH', minutesAgo(30));
    insertTx(db, 'ORIGIN', 'RECV_A', 15000, 'ETH', minutesAgo(10));

    expect(detectHighVelocity(db, 'ORIGIN')).toBe(true);
  });

  test('returns false when total is under threshold', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV_A');

    insertTx(db, 'ORIGIN', 'RECV_A', 10000, 'ETH', minutesAgo(50));
    insertTx(db, 'ORIGIN', 'RECV_A', 15000, 'ETH', minutesAgo(20));

    expect(detectHighVelocity(db, 'ORIGIN')).toBe(false);
  });

  test('returns false when threshold met but spread across >1 hour', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV_A');

    insertTx(db, 'ORIGIN', 'RECV_A', 30000, 'ETH', minutesAgo(90));
    insertTx(db, 'ORIGIN', 'RECV_A', 30000, 'ETH', minutesAgo(10));

    expect(detectHighVelocity(db, 'ORIGIN')).toBe(false);
  });
});

// ── Tests: detectMixerInteraction ────────────────────────────────────────────

describe('detectMixerInteraction', () => {
  test('returns true when wallet sends directly to a Mixer', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'MIXER_ADDR', 'Mixer');

    insertTx(db, 'ORIGIN', 'MIXER_ADDR', 5000, 'ETH', minutesAgo(10));

    expect(detectMixerInteraction(db, 'ORIGIN')).toBe(true);
  });

  test('returns true when wallet receives from a Mixer', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'MIXER_ADDR', 'Mixer');

    insertTx(db, 'MIXER_ADDR', 'ORIGIN', 5000, 'ETH', minutesAgo(10));

    expect(detectMixerInteraction(db, 'ORIGIN')).toBe(true);
  });

  test('returns false when no Mixer interaction exists', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'NORMAL_WALLET', 'EOA');

    insertTx(db, 'ORIGIN', 'NORMAL_WALLET', 5000, 'ETH', minutesAgo(10));

    expect(detectMixerInteraction(db, 'ORIGIN')).toBe(false);
  });
});

// ── Tests: detectChainHopping ─────────────────────────────────────────────────

describe('detectChainHopping', () => {
  test('returns true when connected wallets span ≥2 chains', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN', 'EOA', 'ETH');
    insertWallet(db, 'ETH_WALLET', 'EOA', 'ETH');
    insertWallet(db, 'BTC_WALLET', 'EOA', 'BTC');

    insertTx(db, 'ORIGIN', 'ETH_WALLET', 5000, 'ETH', minutesAgo(20));
    insertTx(db, 'ORIGIN', 'BTC_WALLET', 3000, 'BTC', minutesAgo(15));

    expect(detectChainHopping(db, 'ORIGIN')).toBe(true);
  });

  test('returns false when all connected wallets on same chain', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN', 'EOA', 'ETH');
    insertWallet(db, 'ETH_A',  'EOA', 'ETH');
    insertWallet(db, 'ETH_B',  'EOA', 'ETH');

    insertTx(db, 'ORIGIN', 'ETH_A', 5000, 'ETH', minutesAgo(20));
    insertTx(db, 'ORIGIN', 'ETH_B', 3000, 'ETH', minutesAgo(15));

    expect(detectChainHopping(db, 'ORIGIN')).toBe(false);
  });
});

// ── Tests: detectDormantReactivation ─────────────────────────────────────────

describe('detectDormantReactivation', () => {
  test('returns true when gap >30 days followed by burst of ≥3 txs in 24h', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV');

    // Old activity
    insertTx(db, 'ORIGIN', 'RECV', 100, 'ETH', daysAgo(50));
    insertTx(db, 'ORIGIN', 'RECV', 200, 'ETH', daysAgo(45));

    // Burst after 45-day gap
    const now = new Date();
    insertTx(db, 'ORIGIN', 'RECV', 5000, 'ETH', new Date(now - 3 * 3600_000).toISOString());
    insertTx(db, 'ORIGIN', 'RECV', 6000, 'ETH', new Date(now - 2 * 3600_000).toISOString());
    insertTx(db, 'ORIGIN', 'RECV', 7000, 'ETH', new Date(now - 1 * 3600_000).toISOString());

    expect(detectDormantReactivation(db, 'ORIGIN')).toBe(true);
  });

  test('returns false when there is no dormancy gap', () => {
    const db = getDb();
    insertWallet(db, 'ORIGIN');
    insertWallet(db, 'RECV');

    // Regular daily activity
    for (let i = 10; i >= 0; i--) {
      insertTx(db, 'ORIGIN', 'RECV', 1000, 'ETH', daysAgo(i));
    }

    expect(detectDormantReactivation(db, 'ORIGIN')).toBe(false);
  });
});

// ── Tests: computeRiskScore ───────────────────────────────────────────────────

describe('computeRiskScore', () => {
  test('returns base_risk when no behaviours detected', () => {
    const db = getDb();
    insertWallet(db, 'CLEAN', 'EOA', 'ETH', 10);
    insertWallet(db, 'RECV');
    insertTx(db, 'CLEAN', 'RECV', 500, 'ETH', minutesAgo(30));

    const profile = computeRiskScore('CLEAN', { useCache: false });

    expect(profile.riskScore).toBe(10);
    expect(profile.flags).toHaveLength(0);
  });

  test('adds fan-out penalty correctly', () => {
    const db = getDb();
    insertWallet(db, 'FANOUT', 'EOA', 'ETH', 20);
    insertWallet(db, 'R1');
    insertWallet(db, 'R2');
    insertWallet(db, 'R3');

    insertTx(db, 'FANOUT', 'R1', 10000, 'ETH', minutesAgo(8));
    insertTx(db, 'FANOUT', 'R2', 10000, 'ETH', minutesAgo(6));
    insertTx(db, 'FANOUT', 'R3', 10000, 'ETH', minutesAgo(4));

    const profile = computeRiskScore('FANOUT', { useCache: false });

    expect(profile.flags).toContain('Rapid Fan-Out');
    expect(profile.riskScore).toBe(20 + PENALTIES.RAPID_FAN_OUT);
  });

  test('clamps score at 100', () => {
    const db = getDb();
    // Base 90 + all detectors triggering should still cap at 100
    insertWallet(db, 'HIGH', 'Mixer', 'ETH', 90);
    insertWallet(db, 'MIXER_A', 'Mixer');
    insertWallet(db, 'REC1');
    insertWallet(db, 'REC2');
    insertWallet(db, 'REC3');

    // Trigger fan-out
    insertTx(db, 'HIGH', 'REC1', 60000, 'ETH', minutesAgo(8));
    insertTx(db, 'HIGH', 'REC2', 60000, 'ETH', minutesAgo(6));
    insertTx(db, 'HIGH', 'REC3', 60000, 'ETH', minutesAgo(4));

    const profile = computeRiskScore('HIGH', { useCache: false });

    expect(profile.riskScore).toBeLessThanOrEqual(100);
  });

  test('uses cache when available and fresh', () => {
    const db = getDb();
    insertWallet(db, 'CACHED', 'EOA', 'ETH', 30);

    // Warm the cache with a first call
    const first  = computeRiskScore('CACHED', { useCache: false });
    const second = computeRiskScore('CACHED', { useCache: true });

    expect(second.fromCache).toBe(true);
    expect(second.riskScore).toBe(first.riskScore);
  });

  test('bypasses cache when useCache=false', () => {
    const db = getDb();
    insertWallet(db, 'UNCACHED', 'EOA', 'ETH', 15);

    const profile = computeRiskScore('UNCACHED', { useCache: false });

    expect(profile.fromCache).toBe(false);
  });
});
