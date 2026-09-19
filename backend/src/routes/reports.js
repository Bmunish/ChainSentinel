'use strict';

/**
 * reports.js — /api/reports routes
 */

const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db/database');
const { analyzeBehaviours } = require('../engine/behaviourEngine');
const { generatePredictions } = require('../engine/predictionEngine');
const { generateSection91Notice } = require('../services/pdfService');

// ── GET Section 91 CrPC PDF Notice ────────────────────────────
function handleSection91PDF(req, res, next) {
  try {
    const caseId = req.params.caseId || req.query.case_id || 'CS-2026-001';
    const targetWalletAddress = req.query.wallet || req.params.wallet || req.query.address || null;
    const db = getDb();

    let inv = db.prepare('SELECT * FROM investigations WHERE case_id = ?').get(caseId);
    if (!inv) {
      inv = {
        case_id: caseId,
        case_number: caseId,
        title: 'Suspected Crypto Investment Fraud & Multi-Layer Fund Movement',
        assigned_investigator: 'CP-FCI-042',
        seed_address: targetWalletAddress || '0x7A3F...B91F',
      };
    } else {
      inv.case_number = inv.case_id;
      inv.assigned_to = inv.assigned_investigator || 'CP-FCI-042';
      if (targetWalletAddress) {
        inv.seed_address = targetWalletAddress;
      }
    }

    const targetAddr = targetWalletAddress || inv.seed_address || '0x7A3F...B91F';
    const seedWallet = { address: targetAddr };

    const transactions = db.prepare(`
      SELECT tx_hash, amount, token as token_symbol, timestamp 
      FROM transactions 
      WHERE case_id = ? OR sender = ? OR receiver = ? OR sender LIKE ? OR receiver LIKE ?
      ORDER BY timestamp DESC LIMIT 20
    `).all(caseId, targetAddr, targetAddr, `%${targetAddr}%`, `%${targetAddr}%`);

    const txList = transactions.length > 0
      ? transactions
      : db.prepare('SELECT tx_hash, amount, token as token_symbol, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 20').all();

    logAudit(req.user?.officer_id || 'CP-FCI-042', `Generated Section 91 CrPC PDF notice for case ${caseId} wallet ${targetAddr}`, 'PDF Notice', caseId, 'Success');

    return generateSection91Notice(inv, seedWallet, txList, res);
  } catch (err) {
    next(err);
  }
}

router.get('/section91/pdf', handleSection91PDF);
router.get('/section91/:caseId', handleSection91PDF);
router.get('/:caseId/section91', handleSection91PDF);
router.get('/:caseId/section91-pdf', handleSection91PDF);
router.get('/:caseId/pdf', handleSection91PDF);

router.get('/:caseId?', (req, res, next) => {
  try {
    const caseId = req.params.caseId || req.query.case_id || 'CS-2026-001';
    const targetWalletAddress = req.query.wallet || req.query.address || null;
    const db = getDb();

    const inv = db.prepare('SELECT * FROM investigations WHERE case_id = ?').get(caseId) || {
      case_id: 'CS-2026-001',
      title: 'Suspected Crypto Investment Fraud & Multi-Layer Fund Movement',
      status: 'INVESTIGATING',
      priority: 'CRITICAL',
      assigned_investigator: 'CP-FCI-042',
      victim_ref: 'VIC-2026-089',
      seed_address: '0x7A3F...B91F',
      blockchain: 'Ethereum',
      funds: '₹12.4L',
      created_at: '22 Aug 2026, 09:31 IST',
      notes: 'Victim reported ₹12.4L transferred following an investment fraud call.',
    };

    if (targetWalletAddress) {
      inv.seed_address = targetWalletAddress;
    }


    const wallets = db.prepare('SELECT * FROM wallets LIMIT 20').all();
    const txs = db.prepare('SELECT * FROM transactions LIMIT 20').all();
    const alerts = db.prepare('SELECT * FROM alerts WHERE case_id = ?').all(caseId);
    const evidence = db.prepare('SELECT * FROM evidence WHERE case_id = ?').all(caseId);
    const requests = db.prepare('SELECT * FROM requests WHERE case_id = ?').all(caseId);
    const timeline = db.prepare('SELECT * FROM timeline_events WHERE case_id = ?').all(caseId);
    const behaviours = analyzeBehaviours(caseId);
    const predictions = generatePredictions(caseId);

    // Build structured text / markdown report
    const reportText = `================================================================================
CHAINTRACE — FINANCIAL CRIME INVESTIGATION REPORT
CHANDIGARH POLICE • FINANCIAL CYBER INTELLIGENCE DIVISION
================================================================================
CASE REFERENCE       : ${inv.case_id}
CASE TITLE           : ${inv.title}
INVESTIGATING OFFICER: ${inv.assigned_investigator || 'CP-FCI-042'}
VICTIM REFERENCE     : ${inv.victim_ref || 'VIC-2026-089'}
PRIMARY SEED ADDRESS : ${inv.seed_address} (${inv.blockchain})
TOTAL FUNDS IMPLICATED: ${inv.funds || '₹12.4L'}
REPORT GENERATED     : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
INTELLIGENCE LEVEL   : LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
================================================================================

1. EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
On 22 Aug 2026, an initial complaint was lodged by victim ${inv.victim_ref || 'VIC-2026-089'} regarding fraudulent diversion of ₹12.4 Lakhs via investment fraud. Automated blockchain ingestion traced the fund flow from the victim's source bank account through seed wallet ${inv.seed_address}, subsequent layering distributors, and final deposits into centralized cryptocurrency exchange deposit accounts (Exchange X / Exchange Y).

2. REPORTED SUSPECT WALLET
--------------------------------------------------------------------------------
Address   : ${inv.seed_address}
Network   : ${inv.blockchain}
Risk Score: 94/100 (CRITICAL)
First Seen: 14 Mar 2025
Last Seen : 22 Aug 2026
Inflow    : ₹24,61,000  |  Outflow: ₹11,83,200  |  Balance: ₹18,42,190

3. FUND-FLOW RECONSTRUCTION & MULTI-HOP PATH
--------------------------------------------------------------------------------
Hop 0 (Source)   : HDFC Bank Account ••••4219 → Outflow: ₹12,40,000 [OBSERVED]
Hop 1 (Seed EOA) : ${inv.seed_address} → Inflow ₹12.4L [OBSERVED]
Hop 2 (Fan-Out)  : Layering split to 3 intermediate wallets (0x12AB, 0x92CD, 0xBB91) in 4 mins
Hop 3 (Off-Ramps): Transfers to Exchange X (TX-CS-005, ₹4.21L; TX-CS-008, ₹2.97L) & Exchange Y

4. VASP / EXCHANGE ATTRIBUTION
--------------------------------------------------------------------------------
- Entity: Exchange X
  Category: Regulated VASP / Crypto Exchange (UAE Attributed)
  Linked Transactions: TX-CS-005 (₹4.21L), TX-CS-008 (₹2.97L)
  Attribution Confidence: STRONG (Verified deposit cluster matching KYC account EX-A021)
  Legal Request Status  : REQ-CS-001 [CRITICAL - PENDING KYC DISCLOSURE]

- Entity: Exchange Y
  Category: Crypto Exchange (International)
  Linked Transactions: TX-CS-007 (₹2.76L)
  Attribution Confidence: CONFIRMED
  Legal Request Status  : REQ-CS-003 [HIGH - SENT]

5. BEHAVIOURAL INDICATORS & PATTERN DETECTION
--------------------------------------------------------------------------------
${behaviours.map(b => `[${b.severity}] ${b.name} (${b.entity})\n  - Time: ${b.timeRange}\n  - Detail: ${b.desc}`).join('\n\n')}

6. EXPLAINABLE RISK ASSESSMENT
--------------------------------------------------------------------------------
Overall Risk Score: 94 / 100 [CRITICAL RISK]
Contributing Factors:
  +25 pts : Rapid Fan-Out Pattern (3 destination wallets in 4 minutes)
  +20 pts : Dormant Account Reactivation (9 months dormancy followed by sudden burst)
  +18 pts : Multi-Hop Layering Structure (3 hops before exchange deposit)
  +15 pts : High-Risk Counterparty Connection (Exchange X unverified deposit cluster)
  +10 pts : Multiple Unique Counterparties (5 distinct addresses in 24 hours)
  +6 pts  : High Transaction Velocity (₹10.7L redistributed in 110 minutes)

7. AI-ASSISTED ANALYTICAL ESTIMATES (PREDICTIVE ENGINE)
--------------------------------------------------------------------------------
* DISCLAIMER: Probabilistic estimates based on topological similarity. Not definitive evidence.
${predictions.map(p => `• Destination: ${p.dest} (Confidence: ${p.conf}%)\n  Rationale: ${p.reason}`).join('\n')}

8. FORENSIC EVIDENCE & INTEGRITY PROVENANCE
--------------------------------------------------------------------------------
${evidence.map(e => `[${e.id}] ${e.type} | Entity: ${e.entity} | Hash: ${e.hash} | Status: ${e.status}`).join('\n')}

9. CASE TIMELINE (CHRONOLOGICAL RECONSTRUCTION)
--------------------------------------------------------------------------------
${timeline.map(t => `${t.date} ${t.time} [${t.source}] : ${t.event} — ${t.detail}`).join('\n')}

10. LAWFUL DATA REQUESTS (CrPC Sec 91 / LEA LIFECYCLE)
--------------------------------------------------------------------------------
${requests.map(r => `[${r.id}] Org: ${r.org} | Priority: ${r.priority} | Status: ${r.status} | Legal: ${r.legal}`).join('\n')}

11. SOURCES, CLASSIFICATION & DISCLAIMER
--------------------------------------------------------------------------------
Data Classification:
- OBSERVED  : On-chain ledger transactions & lawful bank transfer disclosures.
- DETECTED  : Algorithmic behavioural detection (velocity, fan-out, layering).
- PREDICTED : Analytical next-hop estimate model.
- SAMPLE    : Demonstration prototype dataset.

Investigating Officer Signature: Insp. Sharma (CP-FCI-042)
Cyber Crime Division • Chandigarh Police
================================================================================
`;

    logAudit(req.user?.officer_id || 'CP-FCI-042', `Generated report for case ${caseId}`, 'Report', caseId, 'Success');

    return res.json({
      success: true,
      data: {
        caseId,
        title: inv.title,
        reportText,
        investigation: inv,
        walletsCount: wallets.length,
        transactionsCount: txs.length,
        evidenceCount: evidence.length,
        requestsCount: requests.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
