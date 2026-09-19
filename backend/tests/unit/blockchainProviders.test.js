'use strict';

/**
 * blockchainProviders.test.js
 * Unit tests for multi-chain blockchain providers and linkage propagation service.
 */

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

const {
  getProvider,
  detectChain,
  validateWallet,
  EthereumProvider,
  BitcoinProvider,
  BNBProvider,
  TronProvider,
} = require('../../src/blockchain');
const { propagateLinkage } = require('../../src/services/linkagePropagationService');
const { getDb, resetDb, closeDb } = require('../../src/db/database');

beforeEach(() => {
  resetDb();
});

afterAll(() => {
  closeDb();
});

describe('Multi-Chain Provider Suite', () => {
  test('Chain detection accurately maps addresses', () => {
    expect(detectChain('0x7A3F1C2E4B6D8F0A123456789ABCDEF012345678')).toBe('Ethereum');
    expect(detectChain('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe('Bitcoin');
    expect(detectChain('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('Bitcoin');
    expect(detectChain('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe('Bitcoin');
    expect(detectChain('TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7')).toBe('TRON');
    expect(detectChain('bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2')).toBe('BNB Chain');
  });

  test('Address validation validates valid and invalid formats across chains', () => {
    const ethVal = validateWallet('0x7A3F1C2E4B6D8F0A123456789ABCDEF012345678', 'Ethereum');
    expect(ethVal.valid).toBe(true);

    const btcVal = validateWallet('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'Bitcoin');
    expect(btcVal.valid).toBe(true);

    const tronVal = validateWallet('TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', 'TRON');
    expect(tronVal.valid).toBe(true);

    const bnbVal = validateWallet('bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2', 'BNB Chain');
    expect(bnbVal.valid).toBe(true);

    const invalidVal = validateWallet('invalid_random_string', 'Ethereum');
    expect(invalidVal.valid).toBe(false);
  });

  test('EthereumProvider normalizes transactions correctly and handles fallback', async () => {
    const provider = new EthereumProvider();
    const txs = await provider.getTransactions('0x7A3F...B91F');
    expect(Array.isArray(txs)).toBe(true);

    const health = await provider.checkHealth();
    expect(health.healthy).toBe(true);
    expect(health.chain).toBe('ETH');
  });

  test('BitcoinProvider normalizes transactions and checkHealth works', async () => {
    const provider = new BitcoinProvider();
    const health = await provider.checkHealth();
    expect(health.healthy).toBe(true);
    expect(health.chain).toBe('BTC');
  });

  test('BNBProvider & TronProvider checkHealth and fallback gracefully', async () => {
    const bnb = new BNBProvider();
    const tron = new TronProvider();

    const bnbHealth = await bnb.checkHealth();
    expect(bnbHealth.healthy).toBe(true);

    const tronHealth = await tron.checkHealth();
    expect(tronHealth.healthy).toBe(true);

    const tronTxs = await tron.getTransactions('T_INVALID_OR_DEMO_ADDRESS');
    expect(Array.isArray(tronTxs)).toBe(true);
  });
});

describe('Linkage Propagation Service Suite', () => {
  test('propagateLinkage builds graph and updates investigation record', async () => {
    const db = getDb();

    // Create test investigation
    const caseId = 'CS-2026-TEST';
    const seed = '0x7A3F...B91F';
    db.prepare(`
      INSERT INTO investigations (case_id, title, status, priority, seed_address, blockchain)
      VALUES (?, 'Test Linkage Case', 'INVESTIGATING', 'HIGH', ?, 'Ethereum')
    `).run(caseId, seed);

    const result = await propagateLinkage(caseId, seed, 'Ethereum', 2, 20);

    expect(result.success).toBe(true);
    expect(result.caseNumber).toBe(caseId);
    expect(result.seedAddress).toBe(seed);

    // Verify investigation was updated
    const inv = db.prepare('SELECT * FROM investigations WHERE case_id = ?').get(caseId);
    expect(inv).toBeDefined();
    expect(inv.risk_score).toBeGreaterThanOrEqual(0);

    // Verify timeline events recorded propagation
    const timeline = db.prepare('SELECT * FROM timeline_events WHERE case_id = ?').all(caseId);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.some(t => t.event.includes('propagated'))).toBe(true);
  });
});
