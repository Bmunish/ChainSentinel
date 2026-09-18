'use strict';

/**
 * seed.js — Comprehensive Mock & Synthetic Data Seeder for ChainTrace
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env.example') });

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb, resetDb } = require('./database');
const { v4: uuidv4 } = require('uuid');

// ── USERS / OFFICERS ──────────────────────────────────────────────────────────
const USERS = [
  {
    officer_id: 'CP-FCI-042',
    name: 'Insp. Sharma',
    role: 'IO',
    unit: 'Financial Cyber Intelligence Division',
    password: 'demo123',
    status: 'ONLINE',
  },
  {
    officer_id: 'CP-FCI-017',
    name: 'SI Gupta',
    role: 'ANALYST',
    unit: 'Cyber Crime Division',
    password: 'demo123',
    status: 'ONLINE',
  },
  {
    officer_id: 'CP-ADMIN-001',
    name: 'DCP Mehta',
    role: 'ADMIN',
    unit: 'Command & Control',
    password: 'admin123',
    status: 'ONLINE',
  },
  {
    officer_id: 'CP-ANA-009',
    name: 'HC Verma',
    role: 'ANALYST',
    unit: 'Intelligence Cell',
    password: 'demo123',
    status: 'OFFLINE',
  },
];

// ── CASES / INVESTIGATIONS ───────────────────────────────────────────────────
const CASES = [
  {
    case_id: 'CS-2026-001',
    title: 'Suspected Crypto Investment Fraud & Multi-Layer Fund Movement',
    description: 'Victim reported ₹12.4L transferred following an investment fraud call. Funds rapidly moved through multiple crypto wallets before reaching exchange platforms.',
    status: 'INVESTIGATING',
    priority: 'CRITICAL',
    risk_score: 94,
    risk_level: 'CRITICAL',
    seed_address: '0x7A3F...B91F',
    seed_type: 'wallet',
    blockchain: 'Ethereum',
    victim_ref: 'VIC-2026-089',
    funds: '₹12.4L',
    notes: 'Victim reported ₹12.4L transferred following an investment fraud call.',
  },
  {
    case_id: 'CS-2026-002',
    title: 'Cross-Border Digital Asset Fraud',
    description: 'Multi-jurisdictional digital asset skimming operation utilizing cross-chain bridges.',
    status: 'EVIDENCE REVIEW',
    priority: 'HIGH',
    risk_score: 82,
    risk_level: 'HIGH',
    seed_address: '0xDIST_1_A9B8C7D6E5F4',
    seed_type: 'wallet',
    blockchain: 'Ethereum',
    victim_ref: 'VIC-2026-044',
    funds: '₹84.2L',
    notes: 'Involves Tron bridge and overseas OTC cash-out.',
  },
  {
    case_id: 'CS-2026-003',
    title: 'Social Engineering Scam Cluster',
    description: 'Syndicate using telegram investment channels to funnel victims into smart contract mixers.',
    status: 'OPEN',
    priority: 'HIGH',
    risk_score: 79,
    risk_level: 'HIGH',
    seed_address: '0xMIXER_2_ETH_SC_A1B2C3D4',
    seed_type: 'wallet',
    blockchain: 'Ethereum',
    victim_ref: 'VIC-2026-102',
    funds: '₹1.1 Cr',
    notes: 'Mixer contract identified in 4 related FIRs.',
  },
  {
    case_id: 'CS-2026-004',
    title: 'Ponzi Scheme Crypto Wallet Network',
    description: 'High-yield investment scheme promising 30% weekly crypto returns.',
    status: 'OPEN',
    priority: 'MEDIUM',
    risk_score: 65,
    risk_level: 'MEDIUM',
    seed_address: '0xFRAUD_ORIGIN_A1B2C3D4E5F6',
    seed_type: 'wallet',
    blockchain: 'Ethereum',
    victim_ref: 'VIC-2026-118',
    funds: '₹3.7 Cr',
    notes: 'Multiple sub-layer distributors identified.',
  },
];

// ── WALLETS ──────────────────────────────────────────────────────────────────
const WALLETS = [
  // Primary Flagship Case Wallets
  {
    address: '0x7A3F...B91F',
    chain: 'Ethereum',
    type: 'Seed Wallet',
    label: 'SEED WALLET',
    entity: null,
    balance: '₹18,42,190',
    inflow: '₹24,61,000',
    outflow: '₹11,83,200',
    tx_count: 48,
    first_seen: '14 Mar 2025',
    last_seen: '22 Aug 2026',
    base_risk: 85,
    risk_score: 94,
    risk_level: 'CRITICAL',
    flagged: 1,
  },
  {
    address: '0x12AB...A8C',
    chain: 'TRON',
    type: 'Transfer Wallet',
    label: 'WALLET B',
    entity: null,
    balance: '₹9,21,700',
    inflow: '₹12,44,000',
    outflow: '₹8,72,000',
    tx_count: 31,
    first_seen: '02 May 2026',
    last_seen: '22 Aug 2026',
    base_risk: 75,
    risk_score: 88,
    risk_level: 'HIGH',
    flagged: 1,
  },
  {
    address: '0x92CD...11D',
    chain: 'Ethereum',
    type: 'Intermediate Wallet',
    label: 'WALLET C',
    entity: null,
    balance: '₹6,74,230',
    inflow: '₹8,18,000',
    outflow: '₹6,24,000',
    tx_count: 19,
    first_seen: '21 Jan 2026',
    last_seen: '22 Aug 2026',
    base_risk: 65,
    risk_score: 76,
    risk_level: 'HIGH',
    flagged: 1,
  },
  {
    address: '0xBB91...3F2',
    chain: 'Ethereum',
    type: 'Transfer Wallet',
    label: 'WALLET D',
    entity: null,
    balance: '₹4,18,400',
    inflow: '₹5,91,000',
    outflow: '₹4,22,000',
    tx_count: 22,
    first_seen: '08 Jun 2026',
    last_seen: '22 Aug 2026',
    base_risk: 70,
    risk_score: 81,
    risk_level: 'HIGH',
    flagged: 1,
  },
  {
    address: '0x44EF...72B',
    chain: 'Bitcoin',
    type: 'Linked Wallet',
    label: 'WALLET E',
    entity: null,
    balance: '₹3,18,900',
    inflow: '₹4,88,000',
    outflow: '₹3,97,000',
    tx_count: 14,
    first_seen: '09 Feb 2026',
    last_seen: '22 Aug 2026',
    base_risk: 55,
    risk_score: 67,
    risk_level: 'MEDIUM',
    flagged: 0,
  },
  {
    address: 'HDFC-4219',
    chain: 'Bank',
    type: 'Source Bank Account',
    label: 'HDFC ••••4219',
    entity: 'HDFC Bank',
    balance: '—',
    inflow: '—',
    outflow: '₹12,40,000',
    tx_count: 1,
    first_seen: '19 Aug 2026',
    last_seen: '22 Aug 2026',
    base_risk: 18,
    risk_score: 18,
    risk_level: 'LOW',
    flagged: 0,
  },
  {
    address: 'Exchange X',
    chain: 'Ethereum',
    type: 'Exchange',
    label: 'EXCH X',
    entity: 'Exchange X',
    balance: '—',
    inflow: '₹7,18,000',
    outflow: '—',
    tx_count: 12,
    first_seen: '01 Jan 2025',
    last_seen: '22 Aug 2026',
    base_risk: 75,
    risk_score: 90,
    risk_level: 'HIGH',
    flagged: 1,
  },
  {
    address: 'Exchange Y',
    chain: 'Ethereum',
    type: 'Exchange',
    label: 'EXCH Y',
    entity: 'Exchange Y',
    balance: '—',
    inflow: '₹2,76,000',
    outflow: '—',
    tx_count: 8,
    first_seen: '15 Mar 2025',
    last_seen: '22 Aug 2026',
    base_risk: 50,
    risk_score: 65,
    risk_level: 'MEDIUM',
    flagged: 0,
  },
  {
    address: 'Exchange Z',
    chain: 'Ethereum',
    type: 'Exchange',
    label: 'EXCH Z',
    entity: 'Exchange Z',
    balance: '—',
    inflow: '—',
    outflow: '—',
    tx_count: 3,
    first_seen: '10 Feb 2026',
    last_seen: '22 Aug 2026',
    base_risk: 20,
    risk_score: 25,
    risk_level: 'LOW',
    flagged: 0,
  },

  // Multi-chain Mock Fraud Cluster Wallets
  { address: '0xFRAUD_ORIGIN_A1B2C3D4E5F6', chain: 'ETH', type: 'EOA', label: 'Fraud Origin', entity: null, base_risk: 65, flagged: 1 },
  { address: '0xDIST_1_A9B8C7D6E5F4', chain: 'ETH', type: 'EOA', label: 'Distributor Alpha', entity: null, base_risk: 40, flagged: 0 },
  { address: '0xDIST_2_F1E2D3C4B5A6', chain: 'ETH', type: 'EOA', label: 'Distributor Beta', entity: null, base_risk: 38, flagged: 0 },
  { address: '0xDIST_3_1A2B3C4D5E6F', chain: 'ETH', type: 'EOA', label: 'Distributor Gamma', entity: null, base_risk: 42, flagged: 0 },
  { address: 'T_MIXER_1_TRON_9Z8Y7X6W5V', chain: 'TRX', type: 'Mixer', label: 'Tron Tumbler', entity: 'Known Mixer Service', base_risk: 90, flagged: 1 },
  { address: '0xMIXER_2_ETH_SC_A1B2C3D4', chain: 'ETH', type: 'Mixer', label: 'Tornado-Like Contract', entity: 'Smart Contract Mixer', base_risk: 88, flagged: 1 },
  { address: '0xCASHOUT_1_OTC_9A8B7C6D', chain: 'ETH', type: 'Exchange', label: 'OTC Desk Alpha', entity: null, base_risk: 55, flagged: 0 },
  { address: 'bc1CASHOUT_2_BTC_5E4D3C2B', chain: 'BTC', type: 'Exchange', label: 'BTC OTC Desk', entity: null, base_risk: 50, flagged: 0 },
  { address: '0xCASHOUT_3_DEX_1F2E3D4C', chain: 'ETH', type: 'DeFi', label: 'DEX Swap Router', entity: null, base_risk: 35, flagged: 0 },
  { address: 'bnb1CASHOUT_4_BNB_A9B8C7D6', chain: 'BNB', type: 'Exchange', label: 'BNB OTC Desk', entity: null, base_risk: 45, flagged: 0 },
  { address: '0xCASHOUT_5_ETH_5F6E7D8C', chain: 'ETH', type: 'EOA', label: 'Final Cashout EOA', entity: null, base_risk: 60, flagged: 0 },
  { address: '0xDORMANT_ORIGIN_1C2D3E4F', chain: 'ETH', type: 'EOA', label: 'Dormant Origin', entity: null, base_risk: 30, flagged: 0 },
  { address: '0xDORMANT_RECV_9A8B7C6D', chain: 'ETH', type: 'EOA', label: 'Dormant Receiver', entity: null, base_risk: 25, flagged: 0 },
  { address: '0xBRIDGE_WORMHOLE_1A2B3C', chain: 'ETH', type: 'Bridge', label: 'Cross-Chain Bridge', entity: 'Wormhole-Like Bridge', base_risk: 20, flagged: 0 },
  { address: '0xBINANCE_HOT_WALLET_14', chain: 'ETH', type: 'Exchange', label: 'Binance Hot Wallet 14', entity: 'Binance', base_risk: 5, flagged: 0 },
  { address: '0xKRAKEN_HOT_WALLET_7B', chain: 'ETH', type: 'Exchange', label: 'Kraken Hot Wallet 7B', entity: 'Kraken', base_risk: 3, flagged: 0 },
  { address: '0xCOINBASE_CUSTODY_22', chain: 'ETH', type: 'Exchange', label: 'Coinbase Custody 22', entity: 'Coinbase', base_risk: 2, flagged: 0 },
  { address: '0xSUB_LAYER_D1_F1E2D3C4', chain: 'ETH', type: 'EOA', label: 'Sub-Layer D1', entity: null, base_risk: 50, flagged: 0 },
];

// ── TRANSACTIONS ─────────────────────────────────────────────────────────────
const TRANSACTIONS = [
  // CS-2026-001 Primary Case Transactions
  {
    tx_hash: '0x7a81cd93f2b489a1c2d3e4f50123456789abcdef',
    sender: 'HDFC-4219',
    receiver: '0x7A3F...B91F',
    amount: 15000,
    value_display: '₹12,40,000',
    token: 'USDT',
    chain: 'Ethereum',
    timestamp: '2026-08-22T04:11:00.000Z',
    block_number: 19820001,
    fee: 4.5,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'TX-CS-001 Primary bank transfer to crypto seed',
    case_id: 'CS-2026-001',
  },
  {
    tx_hash: '0x12ab8f229c1d2e3f4a5b6c7d8e9f0123456789ab',
    sender: '0x7A3F...B91F',
    receiver: '0x12AB...A8C',
    amount: 5800,
    value_display: '₹4,82,000',
    token: 'USDT',
    chain: 'TRON',
    timestamp: '2026-08-22T04:37:00.000Z',
    block_number: 19820042,
    fee: 3.2,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'TX-CS-002 Rapid fan-out hop 1',
    case_id: 'CS-2026-001',
  },
  {
    tx_hash: '0x92fed17a8b9c0d1e2f3a4b5c6d7e8f9012345678',
    sender: '0x7A3F...B91F',
    receiver: '0x92CD...11D',
    amount: 4500,
    value_display: '₹3,74,000',
    token: 'ETH',
    chain: 'Ethereum',
    timestamp: '2026-08-22T04:39:00.000Z',
    block_number: 19820045,
    fee: 6.8,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'TX-CS-003 Rapid fan-out hop 2',
    case_id: 'CS-2026-001',
  },
  {
    tx_hash: '0xb8e1cc47a9b8c7d6e5f40123456789abcdef0123',
    sender: '0x7A3F...B91F',
    receiver: '0xBB91...3F2',
    amount: 3500,
    value_display: '₹2,91,000',
    token: 'USDT',
    chain: 'Ethereum',
    timestamp: '2026-08-22T04:41:00.000Z',
    block_number: 19820048,
    fee: 4.1,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'TX-CS-004 Rapid fan-out hop 3',
    case_id: 'CS-2026-001',
  },
  {
    tx_hash: '0x9d22fa112b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
    sender: '0x12AB...A8C',
    receiver: 'Exchange X',
    amount: 5100,
    value_display: '₹4,21,000',
    token: 'USDT',
    chain: 'TRON',
    timestamp: '2026-08-22T05:11:00.000Z',
    block_number: 19820120,
    fee: 2.5,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'TX-CS-005 Off-ramp deposit to Exchange X',
    case_id: 'CS-2026-001',
  },
  {
    tx_hash: '0x44217c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    sender: '0x92CD...11D',
    receiver: '0x44EF...72B',
    amount: 3800,
    value_display: '₹3,18,000',
    token: 'BTC',
    chain: 'Bitcoin',
    timestamp: '2026-08-22T05:22:00.000Z',
    block_number: 19820140,
    fee: 5.2,
    flagged: 0,
    provenance: 'OBSERVED',
    notes: 'TX-CS-006 Cross-chain hop to BTC wallet',
    case_id: 'CS-2026-001',
  },
  {
    tx_hash: '0xc982b3310a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d',
    sender: '0xBB91...3F2',
    receiver: 'Exchange Y',
    amount: 3300,
    value_display: '₹2,76,000',
    token: 'USDT',
    chain: 'Ethereum',
    timestamp: '2026-08-22T05:33:00.000Z',
    block_number: 19820165,
    fee: 4.8,
    flagged: 0,
    provenance: 'OBSERVED',
    notes: 'TX-CS-007 Deposit to Exchange Y',
    case_id: 'CS-2026-001',
  },
  {
    tx_hash: '0xde41a0913f4a5b6c7d8e9f0123456789abcdef01',
    sender: '0x44EF...72B',
    receiver: 'Exchange X',
    amount: 3600,
    value_display: '₹2,97,000',
    token: 'BTC',
    chain: 'Bitcoin',
    timestamp: '2026-08-22T06:01:00.000Z',
    block_number: 19820210,
    fee: 4.2,
    flagged: 0,
    provenance: 'OBSERVED',
    notes: 'TX-CS-008 Second deposit to Exchange X',
    case_id: 'CS-2026-001',
  },

  // 0xFRAUD_ORIGIN multi-layer transactions
  {
    tx_hash: '0xfa01000000000000000000000000000000000001',
    sender: '0xFRAUD_ORIGIN_A1B2C3D4E5F6',
    receiver: '0xDIST_1_A9B8C7D6E5F4',
    amount: 45000,
    value_display: '$45,000',
    token: 'ETH',
    chain: 'ETH',
    timestamp: '2026-07-01T08:00:00Z',
    block_number: 19250001,
    fee: 12.5,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'Initial fan-out to Dist Alpha',
  },
  {
    tx_hash: '0xfa02000000000000000000000000000000000002',
    sender: '0xFRAUD_ORIGIN_A1B2C3D4E5F6',
    receiver: '0xDIST_2_F1E2D3C4B5A6',
    amount: 37500,
    value_display: '$37,500',
    token: 'ETH',
    chain: 'ETH',
    timestamp: '2026-07-01T08:03:00Z',
    block_number: 19250008,
    fee: 11.8,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'Fan-out to Dist Beta',
  },
  {
    tx_hash: '0xfa03000000000000000000000000000000000003',
    sender: '0xFRAUD_ORIGIN_A1B2C3D4E5F6',
    receiver: '0xDIST_3_1A2B3C4D5E6F',
    amount: 42000,
    value_display: '$42,000',
    token: 'USDT',
    chain: 'ETH',
    timestamp: '2026-07-01T08:07:00Z',
    block_number: 19250015,
    fee: 10.2,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'Fan-out to Dist Gamma',
  },
  {
    tx_hash: '0xfa04000000000000000000000000000000000004',
    sender: '0xDIST_1_A9B8C7D6E5F4',
    receiver: '0xMIXER_2_ETH_SC_A1B2C3D4',
    amount: 40000,
    value_display: '$40,000',
    token: 'ETH',
    chain: 'ETH',
    timestamp: '2026-07-01T09:30:00Z',
    block_number: 19250200,
    fee: 15.0,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'Dist 1 to Mixer Contract',
  },
  {
    tx_hash: '0xfa05000000000000000000000000000000000005',
    sender: '0xMIXER_2_ETH_SC_A1B2C3D4',
    receiver: '0xCASHOUT_1_OTC_9A8B7C6D',
    amount: 30000,
    value_display: '$30,000',
    token: 'ETH',
    chain: 'ETH',
    timestamp: '2026-07-01T12:00:00Z',
    block_number: 19250600,
    fee: 20.0,
    flagged: 1,
    provenance: 'OBSERVED',
    notes: 'Mixer to OTC Alpha',
  },
  {
    tx_hash: '0xfa06000000000000000000000000000000000006',
    sender: '0xCASHOUT_1_OTC_9A8B7C6D',
    receiver: '0xBINANCE_HOT_WALLET_14',
    amount: 28500,
    value_display: '$28,500',
    token: 'ETH',
    chain: 'ETH',
    timestamp: '2026-07-01T16:00:00Z',
    block_number: 19251200,
    fee: 8.0,
    flagged: 0,
    provenance: 'OBSERVED',
    notes: 'OTC Alpha deposit to Binance',
  },
];

// ── ENTITIES / VASPS ──────────────────────────────────────────────────────────
const ENTITIES = [
  {
    name: 'Exchange X',
    entity_type: 'Exchange',
    category: 'Regulated VASP',
    jurisdiction: 'UAE (Attributed)',
    risk_level: 'HIGH',
    attribution_source: 'Internal Intelligence & Deposit Matching',
    confidence: 'STRONG',
    verified: 0,
    notes: 'Receiving exchange for suspect deposits EX-A021 and EX-A087.',
  },
  {
    name: 'Exchange Y',
    entity_type: 'Exchange',
    category: 'Crypto Exchange',
    jurisdiction: 'International',
    risk_level: 'MEDIUM',
    attribution_source: 'Public Registry',
    confidence: 'CONFIRMED',
    verified: 1,
    notes: 'Counterparty exchange in TX-CS-007.',
  },
  {
    name: 'Exchange Z',
    entity_type: 'Exchange',
    category: 'Crypto Exchange',
    jurisdiction: 'Unknown',
    risk_level: 'LOW',
    attribution_source: 'Clustering Analysis',
    confidence: 'POTENTIAL',
    verified: 0,
    notes: 'Potential secondary destination.',
  },
  {
    name: 'HDFC Bank',
    entity_type: 'Bank',
    category: 'Regulated Bank',
    jurisdiction: 'India',
    risk_level: 'LOW',
    attribution_source: 'Authorized Banking Records',
    confidence: 'CONFIRMED',
    verified: 1,
    notes: 'Source financial institution for victim funds.',
  },
];

// ── ALERTS ───────────────────────────────────────────────────────────────────
const ALERTS = [
  {
    id: 'AL-CS-001',
    case_id: 'CS-2026-001',
    wallet_address: '0x7A3F...B91F',
    tx_hash: '0x12ab8f229c1d2e3f4a5b6c7d8e9f0123456789ab',
    alert_type: 'RAPID_FAN_OUT',
    level: 'CRITICAL',
    title: 'Rapid Fan-Out Pattern Detected',
    description: 'Seed wallet 0x7A3F...B91F distributed ₹11.47L to 3 destinations in 4 minutes.',
    risk_score: 94,
    status: 'NEW',
  },
  {
    id: 'AL-CS-002',
    case_id: 'CS-2026-001',
    wallet_address: 'Exchange X',
    tx_hash: '0x9d22fa112b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
    alert_type: 'VASP_DEPOSIT',
    level: 'HIGH',
    title: 'Exchange X Deposit — Funds at Risk',
    description: '₹4.21L + ₹2.97L confirmed deposited to Exchange X. KYC request pending.',
    risk_score: 91,
    status: 'NEW',
  },
  {
    id: 'AL-CS-003',
    case_id: 'CS-2026-001',
    wallet_address: '0x7A3F...B91F',
    tx_hash: '0x7a81cd93f2b489a1c2d3e4f50123456789abcdef',
    alert_type: 'DORMANT_REACTIVATION',
    level: 'HIGH',
    title: 'Dormant Wallet Reactivated',
    description: 'Wallet 0x7A3F...B91F inactive for 9 months, reactivated with ₹12.4L inflow.',
    risk_score: 87,
    status: 'NEW',
  },
  {
    id: 'AL-CS-004',
    case_id: 'CS-2026-001',
    wallet_address: 'Exchange X',
    tx_hash: '',
    alert_type: 'PREDICTIVE_SIGNAL',
    level: 'HIGH',
    title: 'Predictive Alert — Exchange X (78%)',
    description: 'Pattern analysis indicates high probability of further fund movement to Exchange X.',
    risk_score: 82,
    status: 'NEW',
  },
  {
    id: 'AL-CS-005',
    case_id: 'CS-2026-001',
    wallet_address: '0x92CD...11D',
    tx_hash: '0x44217c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    alert_type: 'LAYERING_INDICATOR',
    level: 'MEDIUM',
    title: 'Multi-Hop Layering Indicator',
    description: '3-hop fund movement: bank → wallet → intermediaries → exchanges.',
    risk_score: 74,
    status: 'ACKNOWLEDGED',
  },
];

// ── BEHAVIOURS ───────────────────────────────────────────────────────────────
const BEHAVIOURS = [
  {
    id: 'BH-001',
    case_id: 'CS-2026-001',
    name: 'Dormant Reactivation',
    severity: 'HIGH',
    entity: '0x7A3F...B91F',
    time_range: '14 Mar 2025 – 21 Aug 2026',
    description: 'The wallet showed minimal transaction activity for approximately 9 months following an earlier period of activity. It was then reactivated with a high-value inflow of ₹12.4L within a 24-hour window.',
    evidence: JSON.stringify([
      'Wallet active: 14 Mar 2025',
      'Last activity before reactivation: 19 Nov 2025',
      'Reactivation trigger: TX-CS-001 (₹12.4L inflow)',
      'Dormancy period: ~9 months',
    ]),
  },
  {
    id: 'BH-002',
    case_id: 'CS-2026-001',
    name: 'Rapid Fan-Out',
    severity: 'CRITICAL',
    entity: '0x7A3F...B91F',
    time_range: '22 Aug 2026, 10:07–10:11 IST',
    description: 'The seed wallet distributed funds to three separate destination wallets within a 4-minute window following a large inflow. This pattern is a recognized indicator of layering activity.',
    evidence: JSON.stringify([
      'TX-CS-002: ₹4.82L to 0x12AB...A8C at 10:07',
      'TX-CS-003: ₹3.74L to 0x92CD...11D at 10:09',
      'TX-CS-004: ₹2.91L to 0xBB91...3F2 at 10:11',
      'Total distributed: ₹11.47L in 4 minutes',
    ]),
  },
  {
    id: 'BH-003',
    case_id: 'CS-2026-001',
    name: 'Layering Indicator',
    severity: 'HIGH',
    entity: '0x7A3F...B91F / Network',
    time_range: '22 Aug 2026, 10:07–11:31 IST',
    description: 'Fund movement follows a multi-hop structure: source account → seed wallet → intermediate wallets → exchange platforms. Three hops are observed before funds reach exchange destinations.',
    evidence: JSON.stringify([
      'Hop 1: HDFC-4219 → 0x7A3F...B91F',
      'Hop 2: Fan-out to 3 intermediate wallets',
      'Hop 3: Intermediate wallets → Exchange X / Exchange Y',
      'Time span: 1 hour 50 minutes, 8 transactions',
    ]),
  },
  {
    id: 'BH-004',
    case_id: 'CS-2026-001',
    name: 'Multiple Counterparties',
    severity: 'MEDIUM',
    entity: '0x7A3F...B91F',
    time_range: '22 Aug 2026',
    description: 'The seed wallet has interacted with 5 unique counterparty addresses in a single day, including both wallets and exchange deposit addresses.',
    evidence: JSON.stringify([
      'Counterparties: HDFC-4219, 0x12AB, 0x92CD, 0xBB91, Exchange X',
      'All interactions within 22 Aug 2026',
      'Total unique counterparties in 30-day period: 5',
    ]),
  },
  {
    id: 'BH-005',
    case_id: 'CS-2026-001',
    name: 'Unusual Velocity',
    severity: 'HIGH',
    entity: 'Network',
    time_range: '22 Aug 2026, 09:41–11:31 IST',
    description: '₹12.4L was introduced and ₹10.7L was redistributed across 7 outbound transactions within a 110-minute window.',
    evidence: JSON.stringify([
      'Total inflow: ₹12.4L (1 transaction)',
      'Total outflow: ₹10.7L (7 transactions)',
      'Time window: 110 minutes',
      'Average transaction size: ₹1.53L',
    ]),
  },
];

// ── PREDICTIONS ──────────────────────────────────────────────────────────────
const PREDICTIONS = [
  {
    case_id: 'CS-2026-001',
    source_wallet: '0x7A3F...B91F',
    dest: 'Exchange X',
    conf: 78,
    reason: 'Similar historical fund-flow patterns from wallets 0x12AB...A8C and 0x44EF...72B indicate a higher probability of remaining funds being consolidated at Exchange X.',
    basis: 'Pattern similarity to 3 prior investigated cases',
    label: 'PREDICTED',
    sources: JSON.stringify([
      'TX-CS-005 (Exchange X deposit observed)',
      'TX-CS-008 (Exchange X deposit observed)',
      'Historical pattern analysis',
    ]),
  },
  {
    case_id: 'CS-2026-001',
    source_wallet: '0x7A3F...B91F',
    dest: 'Exchange Z',
    conf: 31,
    reason: 'Minor probability based on cross-case exchange preference patterns. Low confidence — requires additional signal before action.',
    basis: 'Historical cross-case analysis',
    label: 'PREDICTED',
    sources: JSON.stringify(['Low-confidence pattern signal']),
  },
];

// ── EVIDENCE ─────────────────────────────────────────────────────────────────
const EVIDENCE = [
  {
    id: 'EV-CS-001',
    case_id: 'CS-2026-001',
    type: 'Blockchain Transaction Record',
    source: 'Public Blockchain (Ethereum)',
    entity: '0x7A3F...B91F',
    tx_ref: 'TX-CS-002',
    collected_at: '22 Aug 2026, 10:14 IST',
    collected_by: 'CP-FCI-042',
    hash: '7a81cd93f2b489a1c2d3e4f5',
    status: 'Verified',
    notes: 'Transaction hash verified against Ethereum mainnet.',
  },
  {
    id: 'EV-CS-002',
    case_id: 'CS-2026-001',
    type: 'Fund Flow Graph Snapshot',
    source: 'ChainSentinel Platform',
    entity: 'Network',
    tx_ref: '—',
    collected_at: '22 Aug 2026, 10:55 IST',
    collected_by: 'CP-FCI-042',
    hash: 'a81c2211b4f982cd3a7e1190',
    status: 'Collected',
    notes: 'Graph snapshot at time of risk assessment.',
  },
  {
    id: 'EV-CS-003',
    case_id: 'CS-2026-001',
    type: 'Exchange Response (Partial KYC)',
    source: 'Exchange X (Authorized Channel)',
    entity: 'Exchange X',
    tx_ref: 'TX-CS-005',
    collected_at: '22 Aug 2026, 11:42 IST',
    collected_by: 'CP-FCI-017',
    hash: '91cdaaf81144882bc1912a77',
    status: 'Reviewed',
    notes: 'Partial KYC information received. Full disclosure pending REQ-CS-001.',
  },
  {
    id: 'EV-CS-004',
    case_id: 'CS-2026-001',
    type: 'OSINT Reference Capture',
    source: 'Open Source (Public Registry)',
    entity: '0x7A3F...B91F',
    tx_ref: '—',
    collected_at: '22 Aug 2026, 11:58 IST',
    collected_by: 'CP-FCI-042',
    hash: 'b88211c92111019a82bb33cc',
    status: 'Collected',
    notes: 'Public address reference captured. Unverified — requires corroboration.',
  },
  {
    id: 'EV-CS-005',
    case_id: 'CS-2026-001',
    type: 'Bank Transfer Record',
    source: 'Authorized Financial Records',
    entity: 'HDFC-4219',
    tx_ref: 'TX-CS-001',
    collected_at: '22 Aug 2026, 09:58 IST',
    collected_by: 'CP-FCI-042',
    hash: 'de4122a091443f11bc887109',
    status: 'Verified',
    notes: 'Bank transfer record obtained via authorized channel. Source: HDFC Bank (authorized via legal process).',
  },
];

// ── REQUESTS ─────────────────────────────────────────────────────────────────
const REQUESTS = [
  {
    id: 'REQ-CS-001',
    case_id: 'CS-2026-001',
    org: 'Exchange X',
    info: 'Full KYC records and account holder information for deposit addresses EX-A021 and EX-A087',
    legal: 'Section 91 CrPC — Production of documents',
    priority: 'CRITICAL',
    status: 'PENDING',
    created_by: 'CP-FCI-042',
    created_at: '22 Aug 2026, 11:25 IST',
    notes: 'Urgent — funds may be withdrawn soon',
  },
  {
    id: 'REQ-CS-002',
    case_id: 'CS-2026-001',
    org: 'HDFC Bank',
    info: 'Full transaction records for account ••••4219 for the period 01 Aug 2026 – 22 Aug 2026',
    legal: 'Section 91 CrPC — Production of documents',
    priority: 'HIGH',
    status: 'RECEIVED',
    created_by: 'CP-FCI-042',
    created_at: '22 Aug 2026, 10:20 IST',
    notes: 'Records received. Under review.',
  },
  {
    id: 'REQ-CS-003',
    case_id: 'CS-2026-001',
    org: 'Exchange Y',
    info: 'Account holder and KYC information for deposit address linked to TX-CS-007',
    legal: 'Section 91 CrPC',
    priority: 'HIGH',
    status: 'SENT',
    created_by: 'CP-FCI-017',
    created_at: '22 Aug 2026, 11:44 IST',
    notes: '',
  },
  {
    id: 'REQ-CS-004',
    case_id: 'CS-2026-001',
    org: 'Public Address Registry',
    info: 'Attribution data for wallet 0x7A3F...B91F',
    legal: 'Open-source — no legal process required',
    priority: 'MEDIUM',
    status: 'VALIDATED',
    created_by: 'CP-FCI-042',
    created_at: '22 Aug 2026, 10:30 IST',
    notes: 'Attribution: unverified pseudonymous identity linked.',
  },
];

// ── TIMELINE ─────────────────────────────────────────────────────────────────
const TIMELINE = [
  { case_id: 'CS-2026-001', time: '09:14', date: '22 Aug 2026', event: 'Complaint received from victim', detail: 'Victim VIC-2026-089 reported ₹12.4L transferred following investment fraud call.', source: 'Case Intake', dot: 'blue', ref: '' },
  { case_id: 'CS-2026-001', time: '09:31', date: '22 Aug 2026', event: 'Case CS-2026-001 created', detail: 'Investigation opened. Assigned to CP-FCI-042.', source: 'Case Management', dot: 'blue', ref: '' },
  { case_id: 'CS-2026-001', time: '09:41', date: '22 Aug 2026', event: 'Bank transfer record imported', detail: '₹12.4L outflow from HDFC account ••••4219 to crypto address confirmed.', source: 'Authorized Financial Records', dot: 'blue', ref: 'TX-CS-001' },
  { case_id: 'CS-2026-001', time: '10:02', date: '22 Aug 2026', event: 'Seed wallet identified', detail: '0x7A3F...B91F identified as primary receiving address.', source: 'Blockchain Analysis', dot: 'blue', ref: '0x7A3F...B91F' },
  { case_id: 'CS-2026-001', time: '10:07', date: '22 Aug 2026', event: 'Rapid fan-out detected', detail: '3 outbound transactions in 4 minutes. Behavioural pattern flagged.', source: 'Risk Engine', dot: 'orange', ref: 'BH-002' },
  { case_id: 'CS-2026-001', time: '10:14', date: '22 Aug 2026', event: 'Evidence EV-CS-001 collected', detail: 'Transaction hash verified on Ethereum mainnet.', source: 'Evidence Vault', dot: 'blue', ref: 'EV-CS-001' },
  { case_id: 'CS-2026-001', time: '10:20', date: '22 Aug 2026', event: 'Data request REQ-CS-002 created', detail: 'Bank records requested from HDFC Bank.', source: 'Investigator Requests', dot: 'blue', ref: 'REQ-CS-002' },
  { case_id: 'CS-2026-001', time: '10:28', date: '22 Aug 2026', event: 'Wallet cluster identified', detail: '4 connected wallets forming layering network.', source: 'Entity Correlation', dot: 'orange', ref: '' },
  { case_id: 'CS-2026-001', time: '10:55', date: '22 Aug 2026', event: 'Risk score calculated: 94/100 CRITICAL', detail: 'Explainable risk assessment completed. 5 behavioural indicators detected.', source: 'Risk Engine', dot: 'red', ref: '' },
  { case_id: 'CS-2026-001', time: '11:18', date: '22 Aug 2026', event: 'Prediction generated', detail: 'Exchange X identified as probable next destination (78% confidence).', source: 'Prediction Engine', dot: 'purple', ref: '' },
  { case_id: 'CS-2026-001', time: '11:25', date: '22 Aug 2026', event: 'Data request REQ-CS-001 created', detail: 'Exchange X KYC request filed. Priority: CRITICAL.', source: 'Investigator Requests', dot: 'red', ref: 'REQ-CS-001' },
  { case_id: 'CS-2026-001', time: '11:58', date: '22 Aug 2026', event: 'Evidence EV-CS-004 added', detail: 'OSINT reference captured for seed wallet.', source: 'Evidence Vault', dot: 'blue', ref: 'EV-CS-004' },
];

// ── DATA SOURCES ─────────────────────────────────────────────────────────────
const DATA_SOURCES = [
  { name: 'Ethereum Blockchain', type: 'Public blockchain', sync_status: 'Live', records_count: 1482, prov_type: 'OBSERVED', is_active: 1 },
  { name: 'TRON Network', type: 'Public blockchain', sync_status: '2 min ago', records_count: 891, prov_type: 'OBSERVED', is_active: 1 },
  { name: 'Bitcoin Network', type: 'Public blockchain', sync_status: 'Live', records_count: 342, prov_type: 'OBSERVED', is_active: 1 },
  { name: 'BNB Chain', type: 'Public blockchain', sync_status: 'Live', records_count: 218, prov_type: 'OBSERVED', is_active: 1 },
  { name: 'HDFC Bank Records', type: 'Authorized financial', sync_status: 'Authorized pull', records_count: 1, prov_type: 'AUTHORIZED', is_active: 1 },
  { name: 'Exchange X Intelligence', type: 'Exchange KYC (partial)', sync_status: 'REQ-CS-002', records_count: 3, prov_type: 'AUTHORIZED', is_active: 1 },
  { name: 'Sanctions / OFAC Data', type: 'Risk intelligence', sync_status: 'Daily refresh', records_count: 120, prov_type: 'OBSERVED', is_active: 1 },
  { name: 'OSINT Index', type: 'Open source', sync_status: 'Continuous', records_count: 12, prov_type: 'OBSERVED', is_active: 1 },
];

// ── OSINT RECORDS ────────────────────────────────────────────────────────────
const OSINT_RECORDS = [
  { case_id: 'CS-2026-001', title: 'Public forum reference to wallet address', entity: '0x7A3F...B91F', confidence: 'Probable', source: 'Online Forum', captured_at: '22 Aug 2026', notes: 'Reported in high-yield scam thread.' },
  { case_id: 'CS-2026-001', title: 'News article referencing investment scheme', entity: 'Entity Cluster', confidence: 'Unverified', source: 'News Archive', captured_at: '20 Aug 2026', notes: 'Regional cyber cell advisory mention.' },
  { case_id: 'CS-2026-001', title: 'Open address registry mention', entity: '0x7A3F...B91F', confidence: 'Unverified', source: 'Public Registry', captured_at: '19 Aug 2026', notes: 'Scam tag submitted by community.' },
  { case_id: 'CS-2026-001', title: 'Social media post referencing returns', entity: 'Entity Cluster', confidence: 'Low', source: 'Social Media', captured_at: '18 Aug 2026', notes: 'Promotional channel screenshot.' },
];

// ── CROSS BORDER ─────────────────────────────────────────────────────────────
const CROSS_BORDER = [
  {
    case_id: 'CS-2026-001',
    source_country: 'India',
    dest_country: 'UAE',
    hub_name: 'UAE Exchange Hub',
    bridge_mechanism: 'TRC20 / Cross-Chain Bridge',
    source_chain: 'Ethereum',
    dest_chain: 'TRON',
    amount_usd: 14800,
    tx_hash: '0x12ab8f229c1d2e3f4a5b6c7d8e9f0123456789ab',
    confidence: 'PROBABLE',
    notes: 'Victim funds converted to stablecoins and routed to UAE-affiliated VASP.',
  },
];

// ── AUDIT LOGS ───────────────────────────────────────────────────────────────
const AUDIT_LOGS = [
  { timestamp: '22 Aug 2026, 14:36', officer_id: 'CP-FCI-042', action: 'Viewed report preview', resource_type: 'Report', resource_id: 'CS-2026-001', result: 'Success' },
  { timestamp: '22 Aug 2026, 12:04', officer_id: 'CP-FCI-017', action: 'Reviewed evidence', resource_type: 'Evidence', resource_id: 'EV-CS-003', result: 'Success' },
  { timestamp: '22 Aug 2026, 11:58', officer_id: 'CP-FCI-042', action: 'Added evidence', resource_type: 'Evidence', resource_id: 'EV-CS-004', result: 'Success' },
  { timestamp: '22 Aug 2026, 11:44', officer_id: 'CP-FCI-017', action: 'Created data request', resource_type: 'Request', resource_id: 'REQ-CS-003', result: 'Success' },
  { timestamp: '22 Aug 2026, 11:25', officer_id: 'CP-FCI-042', action: 'Created data request', resource_type: 'Request', resource_id: 'REQ-CS-001', result: 'Success' },
  { timestamp: '22 Aug 2026, 10:55', officer_id: 'CP-FCI-042', action: 'Risk assessment completed', resource_type: 'Risk', resource_id: 'CS-2026-001', result: 'Success' },
  { timestamp: '22 Aug 2026, 10:14', officer_id: 'CP-FCI-042', action: 'Collected evidence', resource_type: 'Evidence', resource_id: 'EV-CS-001', result: 'Success' },
  { timestamp: '22 Aug 2026, 09:58', officer_id: 'CP-FCI-042', action: 'Imported bank record', resource_type: 'Evidence', resource_id: 'EV-CS-005', result: 'Success' },
  { timestamp: '22 Aug 2026, 09:31', officer_id: 'CP-FCI-042', action: 'Created case', resource_type: 'Investigation', resource_id: 'CS-2026-001', result: 'Success' },
  { timestamp: '22 Aug 2026, 09:14', officer_id: 'CP-FCI-042', action: 'Logged in', resource_type: 'Auth', resource_id: 'System', result: 'Success' },
];

function seed() {
  const db = getDb();
  console.log('🌱 [Seeder] Starting ChainTrace complete database seeding...');

  resetDb();
  console.log('🗑️  [Seeder] Existing tables cleared.');

  // Users
  const insUser = db.prepare(`
    INSERT INTO users (officer_id, name, role, unit, password_hash, status)
    VALUES (@officer_id, @name, @role, @unit, @password_hash, @status)
  `);
  for (const u of USERS) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(u.password, salt);
    insUser.run({ ...u, password_hash: hash });
  }
  console.log(`✅ [Seeder] Inserted ${USERS.length} officers.`);

  // Cases
  const insCase = db.prepare(`
    INSERT INTO investigations (case_id, title, description, status, priority, risk_score, risk_level, seed_address, seed_type, blockchain, victim_ref, funds, notes)
    VALUES (@case_id, @title, @description, @status, @priority, @risk_score, @risk_level, @seed_address, @seed_type, @blockchain, @victim_ref, @funds, @notes)
  `);
  for (const c of CASES) insCase.run(c);
  console.log(`✅ [Seeder] Inserted ${CASES.length} investigations.`);

  // Wallets
  const insWallet = db.prepare(`
    INSERT INTO wallets (address, chain, type, label, entity, balance, inflow, outflow, tx_count, first_seen, last_seen, base_risk, risk_score, risk_level, flagged)
    VALUES (@address, @chain, @type, @label, @entity, @balance, @inflow, @outflow, @tx_count, @first_seen, @last_seen, @base_risk, @risk_score, @risk_level, @flagged)
  `);
  for (const w of WALLETS) {
    insWallet.run({
      balance: '—',
      inflow: '—',
      outflow: '—',
      tx_count: 12,
      first_seen: '14 Mar 2025',
      last_seen: '22 Aug 2026',
      risk_score: w.base_risk || 50,
      risk_level: (w.base_risk || 50) >= 80 ? 'CRITICAL' : 'MEDIUM',
      entity: null,
      ...w,
    });
  }
  console.log(`✅ [Seeder] Inserted ${WALLETS.length} wallets.`);

  // Transactions
  const insTx = db.prepare(`
    INSERT INTO transactions (tx_hash, sender, receiver, amount, value_display, token, chain, timestamp, block_number, fee, flagged, provenance, notes, case_id)
    VALUES (@tx_hash, @sender, @receiver, @amount, @value_display, @token, @chain, @timestamp, @block_number, @fee, @flagged, @provenance, @notes, @case_id)
  `);
  for (const t of TRANSACTIONS) {
    insTx.run({
      value_display: `$${Math.round(t.amount).toLocaleString()}`,
      chain: 'Ethereum',
      fee: 2.5,
      provenance: 'OBSERVED',
      notes: '',
      case_id: 'CS-2026-001',
      ...t,
    });
  }
  console.log(`✅ [Seeder] Inserted ${TRANSACTIONS.length} transactions.`);

  // Entities
  const insEntity = db.prepare(`
    INSERT INTO entities (name, entity_type, category, jurisdiction, risk_level, attribution_source, confidence, verified, notes)
    VALUES (@name, @entity_type, @category, @jurisdiction, @risk_level, @attribution_source, @confidence, @verified, @notes)
  `);
  for (const e of ENTITIES) insEntity.run(e);
  console.log(`✅ [Seeder] Inserted ${ENTITIES.length} entities & VASPs.`);

  // Alerts
  const insAlert = db.prepare(`
    INSERT INTO alerts (id, case_id, wallet_address, tx_hash, alert_type, level, title, description, risk_score, status)
    VALUES (@id, @case_id, @wallet_address, @tx_hash, @alert_type, @level, @title, @description, @risk_score, @status)
  `);
  for (const a of ALERTS) insAlert.run(a);
  console.log(`✅ [Seeder] Inserted ${ALERTS.length} alerts.`);

  // Behaviours
  const insBehaviour = db.prepare(`
    INSERT INTO behaviours (id, case_id, name, severity, entity, time_range, description, evidence)
    VALUES (@id, @case_id, @name, @severity, @entity, @time_range, @description, @evidence)
  `);
  for (const b of BEHAVIOURS) insBehaviour.run(b);
  console.log(`✅ [Seeder] Inserted ${BEHAVIOURS.length} behavioural indicators.`);

  // Predictions
  const insPrediction = db.prepare(`
    INSERT INTO predictions (case_id, source_wallet, dest, conf, reason, basis, label, sources)
    VALUES (@case_id, @source_wallet, @dest, @conf, @reason, @basis, @label, @sources)
  `);
  for (const p of PREDICTIONS) insPrediction.run(p);
  console.log(`✅ [Seeder] Inserted ${PREDICTIONS.length} predictions.`);

  // Evidence
  const insEvidence = db.prepare(`
    INSERT INTO evidence (id, case_id, type, source, entity, tx_ref, collected_at, collected_by, hash, status, notes)
    VALUES (@id, @case_id, @type, @source, @entity, @tx_ref, @collected_at, @collected_by, @hash, @status, @notes)
  `);
  for (const ev of EVIDENCE) insEvidence.run(ev);
  console.log(`✅ [Seeder] Inserted ${EVIDENCE.length} evidence items.`);

  // Requests
  const insRequest = db.prepare(`
    INSERT INTO requests (id, case_id, org, info, legal, priority, status, created_by, created_at, notes)
    VALUES (@id, @case_id, @org, @info, @legal, @priority, @status, @created_by, @created_at, @notes)
  `);
  for (const r of REQUESTS) insRequest.run(r);
  console.log(`✅ [Seeder] Inserted ${REQUESTS.length} data requests.`);

  // Timeline
  const insTimeline = db.prepare(`
    INSERT INTO timeline_events (case_id, time, date, event, detail, source, dot, ref)
    VALUES (@case_id, @time, @date, @event, @detail, @source, @dot, @ref)
  `);
  for (const t of TIMELINE) insTimeline.run(t);
  console.log(`✅ [Seeder] Inserted ${TIMELINE.length} timeline events.`);

  // Data Sources
  const insSource = db.prepare(`
    INSERT INTO data_sources (name, type, sync_status, records_count, prov_type, is_active)
    VALUES (@name, @type, @sync_status, @records_count, @prov_type, @is_active)
  `);
  for (const s of DATA_SOURCES) insSource.run(s);
  console.log(`✅ [Seeder] Inserted ${DATA_SOURCES.length} data sources.`);

  // OSINT
  const insOsint = db.prepare(`
    INSERT INTO osint_records (case_id, title, entity, confidence, source, captured_at, notes)
    VALUES (@case_id, @title, @entity, @confidence, @source, @captured_at, @notes)
  `);
  for (const o of OSINT_RECORDS) insOsint.run(o);
  console.log(`✅ [Seeder] Inserted ${OSINT_RECORDS.length} OSINT records.`);

  // Cross Border
  const insCross = db.prepare(`
    INSERT INTO cross_border (case_id, source_country, dest_country, hub_name, bridge_mechanism, source_chain, dest_chain, amount_usd, tx_hash, confidence, notes)
    VALUES (@case_id, @source_country, @dest_country, @hub_name, @bridge_mechanism, @source_chain, @dest_chain, @amount_usd, @tx_hash, @confidence, @notes)
  `);
  for (const cb of CROSS_BORDER) insCross.run(cb);
  console.log(`✅ [Seeder] Inserted ${CROSS_BORDER.length} cross-border records.`);

  // Audit Logs
  const insAudit = db.prepare(`
    INSERT INTO audit_logs (timestamp, officer_id, action, resource_type, resource_id, result)
    VALUES (@timestamp, @officer_id, @action, @resource_type, @resource_id, @result)
  `);
  for (const al of AUDIT_LOGS) insAudit.run(al);
  console.log(`✅ [Seeder] Inserted ${AUDIT_LOGS.length} audit logs.`);

  console.log('\n🌟 [Seeder] Complete database seeded successfully for live and demo modes!');
}

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

module.exports = { seed, WALLETS, TRANSACTIONS, CASES };
