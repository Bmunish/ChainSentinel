'use strict';

/**
 * seed.js
 * ──────────────────────────────────────────────────────────────────────────
 * Mock Fraud Cluster Seeder for ChainSentinel.
 *
 * Simulates a realistic 3-layer crypto fraud scheme:
 *
 *   Layer 0 — ORIGIN
 *     └─ 1 high-risk originating wallet (FRAUD_ORIGIN)
 *
 *   Layer 1 — RAPID FAN-OUT DISTRIBUTION (within minutes)
 *     ├─ DIST_1 (ETH)
 *     ├─ DIST_2 (ETH)
 *     └─ DIST_3 (ETH)
 *
 *   Layer 2 — MIXING / TUMBLING
 *     ├─ MIXER_1 (TRX — common Tron-based mixer chain)
 *     └─ MIXER_2 (ETH — smart contract mixer)
 *
 *   Layer 3 — CASH-OUT (OTC / Exchange off-ramp)
 *     ├─ CASHOUT_1 … CASHOUT_5 (multi-chain)
 *
 *   BONUS — Dormant wallet reactivation cluster
 *     └─ DORMANT_ORIGIN → DORMANT_RECV (30+ day gap, then burst)
 *
 *   Known-safe wallets (exchange custodials — baseline reference)
 *     └─ BINANCE_HOT, KRAKEN_HOT, COINBASE_HOT
 *
 * Total: ~18 wallets, ~55 transactions
 * ──────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env.example') });

const { getDb, resetDb } = require('./database');
const { v4: uuidv4 }    = require('uuid');

// ── Wallet Definitions ────────────────────────────────────────────────────────

const WALLETS = [
  // Layer 0 — Fraud Origin
  {
    address:   '0xFRAUD_ORIGIN_A1B2C3D4E5F6',
    chain:     'ETH',
    type:      'EOA',
    label:     'Fraud Origin',
    entity:    null,
    base_risk: 65,
    flagged:   1,
  },

  // Layer 1 — Distribution wallets (rapid fan-out recipients)
  {
    address:   '0xDIST_1_A9B8C7D6E5F4',
    chain:     'ETH',
    type:      'EOA',
    label:     'Distributor Alpha',
    entity:    null,
    base_risk: 40,
    flagged:   0,
  },
  {
    address:   '0xDIST_2_F1E2D3C4B5A6',
    chain:     'ETH',
    type:      'EOA',
    label:     'Distributor Beta',
    entity:    null,
    base_risk: 38,
    flagged:   0,
  },
  {
    address:   '0xDIST_3_1A2B3C4D5E6F',
    chain:     'ETH',
    type:      'EOA',
    label:     'Distributor Gamma',
    entity:    null,
    base_risk: 42,
    flagged:   0,
  },

  // Layer 2 — Mixers / Tumblers
  {
    address:   'T_MIXER_1_TRON_9Z8Y7X6W5V',
    chain:     'TRX',
    type:      'Mixer',
    label:     'Tron Tumbler',
    entity:    'Known Mixer Service',
    base_risk: 90,
    flagged:   1,
  },
  {
    address:   '0xMIXER_2_ETH_SC_A1B2C3D4',
    chain:     'ETH',
    type:      'Mixer',
    label:     'Tornado-Like Contract',
    entity:    'Smart Contract Mixer',
    base_risk: 88,
    flagged:   1,
  },

  // Layer 3 — Cash-out wallets (multi-chain OTC / exchanges)
  {
    address:   '0xCASHOUT_1_OTC_9A8B7C6D',
    chain:     'ETH',
    type:      'Exchange',
    label:     'OTC Desk Alpha',
    entity:    null,
    base_risk: 55,
    flagged:   0,
  },
  {
    address:   'bc1CASHOUT_2_BTC_5E4D3C2B',
    chain:     'BTC',
    type:      'Exchange',
    label:     'BTC OTC Desk',
    entity:    null,
    base_risk: 50,
    flagged:   0,
  },
  {
    address:   '0xCASHOUT_3_DEX_1F2E3D4C',
    chain:     'ETH',
    type:      'DeFi',
    label:     'DEX Swap Router',
    entity:    null,
    base_risk: 35,
    flagged:   0,
  },
  {
    address:   'bnb1CASHOUT_4_BNB_A9B8C7D6',
    chain:     'BNB',
    type:      'Exchange',
    label:     'BNB OTC Desk',
    entity:    null,
    base_risk: 45,
    flagged:   0,
  },
  {
    address:   '0xCASHOUT_5_ETH_5F6E7D8C',
    chain:     'ETH',
    type:      'EOA',
    label:     'Final Cashout EOA',
    entity:    null,
    base_risk: 60,
    flagged:   0,
  },

  // Dormant reactivation cluster
  {
    address:   '0xDORMANT_ORIGIN_1C2D3E4F',
    chain:     'ETH',
    type:      'EOA',
    label:     'Dormant Origin (Reactivated)',
    entity:    null,
    base_risk: 30,
    flagged:   0,
  },
  {
    address:   '0xDORMANT_RECV_9A8B7C6D',
    chain:     'ETH',
    type:      'EOA',
    label:     'Dormant Receiver',
    entity:    null,
    base_risk: 25,
    flagged:   0,
  },

  // Bridge wallet (cross-chain hop — used by DIST_2)
  {
    address:   '0xBRIDGE_WORMHOLE_1A2B3C',
    chain:     'ETH',
    type:      'Bridge',
    label:     'Cross-Chain Bridge',
    entity:    'Wormhole-Like Bridge',
    base_risk: 20,
    flagged:   0,
  },

  // Known-safe reference wallets (legit exchange custodials)
  {
    address:   '0xBINANCE_HOT_WALLET_14',
    chain:     'ETH',
    type:      'Exchange',
    label:     'Binance Hot Wallet 14',
    entity:    'Binance',
    base_risk: 5,
    flagged:   0,
  },
  {
    address:   '0xKRAKEN_HOT_WALLET_7B',
    chain:     'ETH',
    type:      'Exchange',
    label:     'Kraken Hot Wallet 7B',
    entity:    'Kraken',
    base_risk: 3,
    flagged:   0,
  },
  {
    address:   '0xCOINBASE_CUSTODY_22',
    chain:     'ETH',
    type:      'Exchange',
    label:     'Coinbase Custody 22',
    entity:    'Coinbase',
    base_risk: 2,
    flagged:   0,
  },

  // Additional layering wallet (DIST_1 sub-layer)
  {
    address:   '0xSUB_LAYER_D1_F1E2D3C4',
    chain:     'ETH',
    type:      'EOA',
    label:     'Sub-Layer D1',
    entity:    null,
    base_risk: 50,
    flagged:   0,
  },
];

// ── Helper: generate transaction ──────────────────────────────────────────────

function tx(sender, receiver, amount, token, timestampISO, blockNum, fee = 0, flagged = 0, notes = null) {
  return {
    tx_hash:      '0x' + uuidv4().replace(/-/g, ''),
    sender,
    receiver,
    amount,
    token,
    timestamp:    timestampISO,
    block_number: blockNum,
    fee,
    flagged,
    notes,
  };
}

// ── Timeline Helpers ──────────────────────────────────────────────────────────

const BASE_TIME = new Date('2026-07-01T08:00:00Z');

/** Returns ISO string for BASE_TIME + N minutes */
function t(minutesOffset) {
  return new Date(BASE_TIME.getTime() + minutesOffset * 60 * 1000).toISOString();
}

/** Returns ISO string for BASE_TIME + N days */
function td(daysOffset, hoursOffset = 0) {
  const ms = (daysOffset * 24 * 60 + hoursOffset * 60) * 60 * 1000;
  return new Date(BASE_TIME.getTime() + ms).toISOString();
}

// ── Aliases (shorthand for readability) ──────────────────────────────────────

const W = {
  ORIGIN:   '0xFRAUD_ORIGIN_A1B2C3D4E5F6',
  D1:       '0xDIST_1_A9B8C7D6E5F4',
  D2:       '0xDIST_2_F1E2D3C4B5A6',
  D3:       '0xDIST_3_1A2B3C4D5E6F',
  MX1:      'T_MIXER_1_TRON_9Z8Y7X6W5V',
  MX2:      '0xMIXER_2_ETH_SC_A1B2C3D4',
  CO1:      '0xCASHOUT_1_OTC_9A8B7C6D',
  CO2:      'bc1CASHOUT_2_BTC_5E4D3C2B',
  CO3:      '0xCASHOUT_3_DEX_1F2E3D4C',
  CO4:      'bnb1CASHOUT_4_BNB_A9B8C7D6',
  CO5:      '0xCASHOUT_5_ETH_5F6E7D8C',
  DRM_O:    '0xDORMANT_ORIGIN_1C2D3E4F',
  DRM_R:    '0xDORMANT_RECV_9A8B7C6D',
  BRIDGE:   '0xBRIDGE_WORMHOLE_1A2B3C',
  BINANCE:  '0xBINANCE_HOT_WALLET_14',
  KRAKEN:   '0xKRAKEN_HOT_WALLET_7B',
  COINBASE: '0xCOINBASE_CUSTODY_22',
  SUB_D1:   '0xSUB_LAYER_D1_F1E2D3C4',
};

// ── Transaction Definitions ───────────────────────────────────────────────────

const TRANSACTIONS = [

  // ── LAYER 0 → LAYER 1: Rapid Fan-Out (within 8 minutes) ──────────────────
  // These three transactions happen within a 10-min window → triggers RAPID_FAN_OUT
  tx(W.ORIGIN, W.D1,  45000,  'ETH',  t(0),   19_250_001, 12.5,  1, 'Initial fan-out to Dist Alpha'),
  tx(W.ORIGIN, W.D2,  37500,  'ETH',  t(3),   19_250_008, 11.8,  1, 'Fan-out to Dist Beta'),
  tx(W.ORIGIN, W.D3,  42000,  'USDT', t(7),   19_250_015, 10.2,  1, 'Fan-out to Dist Gamma'),
  // Follow-up origin transactions — adds velocity
  tx(W.ORIGIN, W.D1,  25000,  'ETH',  t(30),  19_250_080, 8.5,   1, 'Second tranche to D1'),
  tx(W.ORIGIN, W.D2,  18000,  'USDT', t(45),  19_250_110, 7.1,   0, 'Second tranche to D2'),

  // ── LAYER 1 → LAYER 2: Distributors to Mixers ────────────────────────────
  // D1 → MX2 (ETH mixer)
  tx(W.D1, W.MX2, 40000, 'ETH',  t(90),  19_250_200, 15.0, 1, 'D1 → Tornado-Like Contract'),
  tx(W.D1, W.MX2, 28000, 'ETH',  t(95),  19_250_210, 14.2, 1, 'D1 → Mixer second batch'),

  // D1 → SUB_D1 (extra layering hop)
  tx(W.D1, W.SUB_D1, 2000, 'ETH', t(100), 19_250_220, 5.0, 0, 'Layering sub-hop'),

  // D2 → BRIDGE → MX1 (cross-chain hop via bridge to Tron mixer)
  tx(W.D2, W.BRIDGE,  35000, 'ETH',   t(120), 19_250_280, 18.0, 1, 'D2 → Cross-Chain Bridge'),
  tx(W.BRIDGE, W.MX1, 34200, 'USDT',  t(145), 19_250_320, 12.0, 1, 'Bridge → Tron Tumbler (cross-chain)'),

  // D3 → MX1 (direct to Tron mixer)
  tx(W.D3, W.MX1, 38000, 'USDT', t(150), 19_250_340, 16.5, 1, 'D3 → Tron Tumbler'),
  tx(W.D3, W.MX1, 3800,  'USDT', t(153), 19_250_345, 3.5,  1, 'D3 → Tron Tumbler (fee refund tranche)'),

  // SUB_D1 → CO3 (sub-layer straight to DEX)
  tx(W.SUB_D1, W.CO3, 1800, 'ETH', t(200), 19_250_480, 4.5, 0, 'Sub-layer to DEX'),

  // ── LAYER 2 → LAYER 3: Mixers to Cash-out ────────────────────────────────
  // MX2 → CO1 (OTC)
  tx(W.MX2, W.CO1, 30000, 'ETH',  t(240), 19_250_600, 20.0, 1, 'Mixer → OTC Alpha'),
  tx(W.MX2, W.CO1, 15000, 'ETH',  t(255), 19_250_640, 18.5, 1, 'Mixer → OTC Alpha (second batch)'),

  // MX2 → CO5 (final EOA)
  tx(W.MX2, W.CO5, 22000, 'ETH', t(260), 19_250_660, 12.0, 1, 'Mixer → Final EOA'),

  // MX1 → CO2 (BTC OTC)
  tx(W.MX1, W.CO2, 28000, 'USDT', t(300), 19_250_800, 22.0, 1, 'Tron Tumbler → BTC OTC'),
  tx(W.MX1, W.CO4, 20000, 'USDT', t(310), 19_250_820, 17.0, 1, 'Tron Tumbler → BNB OTC'),
  tx(W.MX1, W.CO3, 14000, 'USDT', t(320), 19_250_850, 10.0, 0, 'Tron Tumbler → DEX Swap'),

  // ── LAYER 3: Cash-out wallets transact with known exchanges ──────────────
  tx(W.CO1, W.BINANCE, 28500, 'ETH',  t(480), 19_251_200, 8.0, 0, 'OTC Alpha deposit → Binance'),
  tx(W.CO2, W.KRAKEN,  26000, 'BTC',  t(500), 19_251_250, 5.0, 0, 'BTC OTC deposit → Kraken'),
  tx(W.CO3, W.COINBASE, 15500, 'ETH', t(520), 19_251_300, 4.5, 0, 'DEX output → Coinbase Custody'),
  tx(W.CO4, W.BINANCE, 19000, 'BNB',  t(540), 19_251_360, 6.5, 0, 'BNB OTC → Binance'),
  tx(W.CO5, W.KRAKEN,  21000, 'ETH',  t(560), 19_251_420, 7.0, 0, 'Final EOA → Kraken'),

  // ── DORMANT REACTIVATION CLUSTER ─────────────────────────────────────────
  // Initial activity 45+ days ago, then sudden burst of 4 transactions within hours
  tx(W.DRM_O, W.DRM_R, 500,  'ETH', td(-45), 19_100_001, 2.0, 0, 'Dormant origin — old activity'),
  tx(W.DRM_O, W.DRM_R, 750,  'ETH', td(-46), 19_099_800, 1.5, 0, 'Dormant origin — old activity 2'),

  // 45-day gap, then burst (these 4 transactions trigger DORMANT_REACTIVATION)
  tx(W.DRM_O, W.DRM_R,  12000, 'ETH',  td(0, 1), 19_250_003, 6.0, 1, 'Reactivation burst #1'),
  tx(W.DRM_O, W.DRM_R,  15000, 'USDT', td(0, 2), 19_250_007, 7.5, 1, 'Reactivation burst #2'),
  tx(W.DRM_O, W.DRM_R,  9000,  'ETH',  td(0, 3), 19_250_011, 5.5, 1, 'Reactivation burst #3'),
  tx(W.DRM_O, W.CO1,    8000,  'ETH',  td(0, 5), 19_250_020, 4.0, 1, 'Reactivation → OTC Alpha'),

  // DRM_R then fans out (triggers FAN-OUT on DRM_R)
  tx(W.DRM_R, W.D1,    4000, 'ETH',  td(0, 6),  19_250_025, 3.0, 1, 'Dormant Recv → D1'),
  tx(W.DRM_R, W.CO3,   3500, 'ETH',  td(0, 7),  19_250_030, 2.5, 0, 'Dormant Recv → DEX'),
  tx(W.DRM_R, W.BRIDGE,3200, 'USDT', td(0, 7.5),19_250_033, 2.0, 1, 'Dormant Recv → Bridge'),

  // ── LEGITIMATE BASELINE TRANSACTIONS (for comparison/contrast) ───────────
  tx(W.BINANCE,  W.COINBASE, 500000, 'ETH',  td(1), 19_252_000, 50.0,  0, 'Inter-exchange settlement'),
  tx(W.KRAKEN,   W.BINANCE,  350000, 'BTC',  td(2), 19_252_500, 40.0,  0, 'Inter-exchange settlement'),
  tx(W.COINBASE, W.KRAKEN,   200000, 'USDT', td(3), 19_253_000, 30.0,  0, 'Stablecoin liquidity rebalance'),

  // ── ADDITIONAL ORGANIC TRANSACTIONS (make graph richer) ──────────────────
  tx(W.D1, W.CO3,     5000,  'ETH',  t(180), 19_250_440, 8.0,  0, 'D1 → DEX partial off-ramp'),
  tx(W.D2, W.CO1,     4000,  'USDT', t(200), 19_250_480, 6.5,  0, 'D2 → OTC partial off-ramp'),
  tx(W.D3, W.CO5,     6000,  'ETH',  t(210), 19_250_510, 7.0,  0, 'D3 → Final EOA partial'),
  tx(W.ORIGIN, W.MX2, 10000, 'ETH',  t(60),  19_250_140, 9.5,  1, 'Origin → Direct mixer interaction'),

  // CO1 internal churn
  tx(W.CO1, W.CO5,    3500, 'ETH',  t(470), 19_251_180, 5.0,  0, 'OTC Alpha internal transfer'),

  // Bridge additional activity
  tx(W.BRIDGE, W.D1,  500,  'ETH',  t(160), 19_250_380, 2.0,  0, 'Bridge refund partial'),
];

// ── Main Seeder Function ──────────────────────────────────────────────────────

function seed() {
  const db = getDb();

  console.log('🌱 [Seeder] Starting ChainSentinel mock fraud cluster seeding...');
  console.log(`   Wallets to insert:      ${WALLETS.length}`);
  console.log(`   Transactions to insert: ${TRANSACTIONS.length}`);

  // Reset existing data
  resetDb();
  console.log('🗑️  [Seeder] Existing data cleared.');

  // Insert wallets
  const insertWallet = db.prepare(`
    INSERT INTO wallets (address, chain, type, label, entity, base_risk, flagged)
    VALUES (@address, @chain, @type, @label, @entity, @base_risk, @flagged)
  `);

  const insertManyWallets = db.transaction((wallets) => {
    for (const w of wallets) insertWallet.run(w);
  });

  insertManyWallets(WALLETS);
  console.log(`✅ [Seeder] Inserted ${WALLETS.length} wallets.`);

  // Insert transactions
  const insertTx = db.prepare(`
    INSERT INTO transactions
      (tx_hash, sender, receiver, amount, token, timestamp, block_number, fee, flagged, notes)
    VALUES
      (@tx_hash, @sender, @receiver, @amount, @token, @timestamp, @block_number, @fee, @flagged, @notes)
  `);

  const insertManyTxs = db.transaction((txs) => {
    for (const t of txs) insertTx.run(t);
  });

  insertManyTxs(TRANSACTIONS);
  console.log(`✅ [Seeder] Inserted ${TRANSACTIONS.length} transactions.`);

  // Insert a sample investigation
  db.prepare(`
    INSERT INTO investigations (case_id, title, seed_address, status, officer_id, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'CASE-2026-CHD-0042',
    'Operation Phantom Chain — Multi-Layer Crypto Fraud Cluster',
    W.ORIGIN,
    'ACTIVE',
    'CP-FCI-042',
    'Originating wallet identified via tip-off. Rapid fan-out detected within first 10 minutes. ' +
    'Funds traced through two mixing services before reaching OTC desks. Under active investigation.'
  );
  console.log('✅ [Seeder] Sample investigation created.');

  // Print summary
  const walletCount = db.prepare('SELECT COUNT(*) AS cnt FROM wallets').get().cnt;
  const txCount     = db.prepare('SELECT COUNT(*) AS cnt FROM transactions').get().cnt;
  const totalVol    = db.prepare('SELECT SUM(amount) AS vol FROM transactions').get().vol;

  console.log('\n📊 [Seeder] Database Summary:');
  console.log(`   Total wallets:      ${walletCount}`);
  console.log(`   Total transactions: ${txCount}`);
  console.log(`   Total volume (USD): $${totalVol?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`\n🎯 Seed address for graph traversal: ${W.ORIGIN}`);
  console.log('   Try: GET /api/trace/0xFRAUD_ORIGIN_A1B2C3D4E5F6?hops=3\n');
}

// ── Run if executed directly ──────────────────────────────────────────────────
if (require.main === module) {
  try {
    seed();
    process.exit(0);
  } catch (err) {
    console.error('❌ [Seeder] Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { seed, WALLETS, TRANSACTIONS, W };
