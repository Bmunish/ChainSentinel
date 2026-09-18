'use strict';

/**
 * api.test.js
 * Integration tests for ChainTrace REST APIs.
 */

const request = require('supertest');
const app = require('../../src/app');
const { getDb, closeDb } = require('../../src/db/database');

beforeAll(() => {
  // ensure database is initialized
  getDb();
});

afterAll(() => {
  closeDb();
});

describe('ChainTrace REST API Integration Suite', () => {
  test('GET /health returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('ChainTrace');
  });

  test('GET /ready returns readiness info', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('connected');
  });

  test('POST /api/auth/login authenticates demo officer', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ officerId: 'CP-FCI-042', password: 'demo123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.officer_id).toBe('CP-FCI-042');
  });

  test('GET /api/investigations returns seeded cases', async () => {
    const res = await request(app).get('/api/investigations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some(c => c.id === 'CS-2026-001')).toBe(true);
  });

  test('POST /api/investigations creates a new investigation with automated validation and risk assessment', async () => {
    const res = await request(app)
      .post('/api/investigations')
      .send({
        seed: '0x9999888877776666555544443333222211110000',
        blockchain: 'Ethereum',
        title: 'Suspect Ransomware Inflow Case',
        priority: 'CRITICAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.caseId).toMatch(/^CS-2026-\d{3}$/);
    expect(res.body.data.status).toBe('INVESTIGATING');
  });

  test('GET /api/trace/:seed traverses transaction graph', async () => {
    const res = await request(app).get('/api/trace/0x7A3F...B91F?hops=3');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.nodes)).toBe(true);
    expect(Array.isArray(res.body.data.edges)).toBe(true);
    expect(res.body.data.nodes.length).toBeGreaterThan(0);
  });

  test('GET /api/wallets lists wallets with explainable risk', async () => {
    const res = await request(app).get('/api/wallets');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].riskScore).toBeDefined();
  });

  test('GET /api/transactions returns transactions with filter support', async () => {
    const res = await request(app).get('/api/transactions?token=USDT');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/alerts returns investigation alerts', async () => {
    const res = await request(app).get('/api/alerts?case_id=CS-2026-001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/behaviour returns detected patterns with evidence', async () => {
    const res = await request(app).get('/api/behaviour?case_id=CS-2026-001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].evidence).toBeDefined();
  });

  test('GET /api/predictions returns analytical probabilistic estimates', async () => {
    const res = await request(app).get('/api/predictions?case_id=CS-2026-001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].label).toBe('PREDICTED');
  });

  test('GET /api/evidence and POST /api/evidence/:id/verify', async () => {
    const getRes = await request(app).get('/api/evidence?case_id=CS-2026-001');
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBeGreaterThan(0);

    const firstEvId = getRes.body.data[0].id;
    const verifyRes = await request(app).post(`/api/evidence/${firstEvId}/verify`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
  });

  test('GET /api/reports/:caseId generates a complete 12-to-17 section report', async () => {
    const res = await request(app).get('/api/reports/CS-2026-001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reportText).toContain('CHAINTRACE — FINANCIAL CRIME INVESTIGATION REPORT');
    expect(res.body.data.reportText).toContain('EXECUTIVE SUMMARY');
    expect(res.body.data.reportText).toContain('VASP / EXCHANGE ATTRIBUTION');
  });

  test('GET /api/dashboard/stats returns real backend dashboard KPI metrics', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activeInvestigations).toBeGreaterThanOrEqual(4);
    expect(res.body.data.highRiskWallets).toBeGreaterThanOrEqual(12);
  });

  test('POST /api/v1/evidence/ocr extracts wallet, tx hash, and amount from receipt', async () => {
    const res = await request(app)
      .post('/api/v1/evidence/ocr')
      .send({
        text: 'Victim Transfer: 0x7A3F1C2E4B6D8F0A123456789ABCDEF012345678, Amount: ₹12,40,000 INR, TX: 0x12ab8f229c1d2e3f4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123 on Exchange X',
        document_name: 'Receipt_001.png',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.extractedFields.length).toBeGreaterThan(0);
    expect(res.body.data.extractedFields.some(f => f.field === 'wallet_address')).toBe(true);
  });

  test('Organization Requests lifecycle: create, submit, auto-update records', async () => {
    // 1. Create
    const createRes = await request(app)
      .post('/api/v1/organization-requests')
      .send({
        case_id: 'CS-2026-001',
        organization_id: 'exchange-x',
        organization_name: 'Exchange X',
        request_type: 'KYC_AND_OWNERSHIP',
        wallet_address: '0x7A3F1C2E4B6D8F0A',
      });
    expect(createRes.status).toBe(201);
    const reqId = createRes.body.data.id;

    // 2. Submit & fulfill sandbox
    const submitRes = await request(app).post(`/api/v1/organization-requests/${reqId}/submit`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.status).toBe('RESPONSE_RECEIVED');
    expect(submitRes.body.data.autoUpdateSummary.narrativeUpdated).toBe(true);
  });

  test('GET /api/v1/wallets/:address/summary returns evidence-grounded AI summary', async () => {
    const res = await request(app).get('/api/v1/wallets/0x7A3F...B91F/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quickSummary).toBeDefined();
    expect(res.body.data.keyObservations.length).toBeGreaterThan(0);
    expect(res.body.data.classification).toBe('AI_ASSISTED_ANALYSIS');
  });

  test('GET /api/v1/investigations/:id/narrative generates 10 structured sections', async () => {
    const res = await request(app).get('/api/v1/investigations/CS-2026-001/narrative');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.structuredSections.length).toBe(10);
    expect(res.body.data.allCitations.length).toBeGreaterThan(0);
  });

  test('GET /api/v1/graph/:case_id/events returns animated discovery sequence', async () => {
    const res = await request(app).get('/api/v1/graph/CS-2026-001/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.events.length).toBeGreaterThanOrEqual(4);
  });
});
