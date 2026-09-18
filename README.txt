================================================================================
CHAINTRACE (CHAINSENTINEL) — COMPREHENSIVE SYSTEM & PROTOTYPE DOCUMENTATION
Problem Statement: 26183
Theme: Cybersecurity × Blockchain — Dark Tech
Authority: Chandigarh Police • Financial Cyber Intelligence Division
================================================================================

ChainTrace is an enterprise-grade, end-to-end financial intelligence and automated
blockchain analysis platform. It is engineered specifically for law enforcement
agencies, cybercrime cells, and financial intelligence units (FIUs) to solve the
critical national challenge:

"Real-Time Identification of Fraud-Linked Cryptocurrency Exchanges from
 Victim-Reported Suspect Wallet Addresses through Automated Blockchain Analysis."

This document provides an exhaustive, line-by-line, stage-by-stage explanation of
the entire application, prototype architecture, backend engines, databases, AI
services, data flows, and frontend user interface.

================================================================================
TABLE OF CONTENTS
================================================================================
1. Quick Start & Execution Guide
2. High-Level Architectural Blueprint & Flow Diagrams
3. Exhaustive Stage-by-Stage / Line-by-Line System Working
   - STAGE 1: Officer Authentication & Role-Based Access Control (RBAC)
   - STAGE 2: OCR Document Evidence Ingestion & Human-in-the-Loop Verification
   - STAGE 3: Case Intake & Multi-Chain Address Auto-Detection
   - STAGE 4: Blockchain Provider Abstraction Layer (RPC / UTXO / Indexers)
   - STAGE 5: Financial Intelligence Graph & Real-Time Discovery Animation
   - STAGE 6: Interactive Graph Nodes & Grounded AI Investigative Summaries
   - STAGE 7: 8-Rule Deterministic Behavioural Fraud Pattern Detection Engine
   - STAGE 8: Explainable Factor-Based Risk Scoring Model (0–100 Scale)
   - STAGE 9: VASP & Cryptocurrency Exchange Attribution & Confidence Tiers
   - STAGE 10: Unified Organization Request Gateway (Section 91 CrPC)
   - STAGE 11: Automated Investigation Record Updates Pipeline
   - STAGE 12: Chronological Timeline → 10-Section AI Auto Narrative Engine
   - STAGE 13: Cryptographic Evidence Vault with SHA-256 Chain of Custody
   - STAGE 14: Probabilistic Next-Hop Predictive Analytics
   - STAGE 15: 12-Section Court-Ready Forensic Dossier Generation & Export
   - STAGE 16: Live Background State Synchronization & Polling
4. Comprehensive Codebase & Directory Structure
5. Relational Database Schema & Data Models (SQLite / Neo4j)
6. Complete REST API Endpoint Directory & Payloads
7. Flagship Demonstration Scenarios & Test Accounts
8. Automated Verification & Test Suite (38/38 Tests Passing)
9. Data Provenance & Legal Integrity Standards

================================================================================
1. QUICK START & EXECUTION GUIDE
================================================================================

PREREQUISITES:
- Node.js (v18.0.0 or higher recommended)
- Python 3.x (or any static HTTP server for the frontend)
- Modern Web Browser (Chrome, Brave, Edge, Firefox, or Safari)

--------------------------------------------------------------------------------
STEP 1: Backend Server Setup & Database Seeding (Terminal 1)
--------------------------------------------------------------------------------
$ cd backend
$ npm install

# Initialize and seed the SQLite database with complete flagship investigation cases:
$ node src/db/seed.js

# Output:
# [SEED] Database seeded successfully: 27 wallets, 14 txs, 5 alerts, 5 behaviours, 3 evidence items, 4 org requests.

# Start the Express REST API server:
$ npm run start
# Server starts on: http://localhost:3001

--------------------------------------------------------------------------------
STEP 2: Frontend Client Execution (Terminal 2)
--------------------------------------------------------------------------------
$ cd ..   # (In root repository folder)
$ python3 -m http.server 5500

# Access the platform in your browser at:
# http://localhost:5500/index.html

--------------------------------------------------------------------------------
STEP 3: Run the Automated Test Suite (Terminal 3)
--------------------------------------------------------------------------------
$ cd backend
$ npm test

# Executes 38 automated unit and integration tests across scoring math and API endpoints:
# PASS tests/unit/riskScoring.test.js (14 tests)
# PASS tests/integration/api.test.js (24 tests)
# Test Suites: 2 passed, 2 total | Tests: 38 passed, 38 total

--------------------------------------------------------------------------------
DEMONSTRATION CREDENTIALS:
--------------------------------------------------------------------------------
1. Investigating Officer (IO) :
   - Officer ID : CP-FCI-042
   - PIN / Pass : demo123 (or demo)
   - Scope      : Intake, Graph, Section 91 CrPC, Timeline, Reports, AI Narrative

2. Senior Financial Analyst :
   - Officer ID : CP-FCI-017
   - PIN / Pass : demo123
   - Scope      : Deep Graph Traversal, Pattern Analysis, Clustering, Predictions

3. System Administrator :
   - Officer ID : CP-ADMIN-001
   - PIN / Pass : admin123
   - Scope      : User Management, Telemetry Diagnostics, Full System Audit Trail

4. Instant Biometric Access :
   - Click the "♢ Biometric Authentication" button on the login screen for instant 1-click entry.

================================================================================
2. HIGH-LEVEL ARCHITECTURAL BLUEPRINT & FLOW DIAGRAMS
================================================================================

+-------------------------------------------------------------------------------+
|                       CHAINTRACE UNIFIED PLATFORM UI                          |
|  Single-Page Application (SPA) • Vanilla HTML5 / CSS3 / SVG • Zero-Build Tool |
|                                                                               |
| [ Top Bar ]: Live Case Switcher • Officer Badge • System Telemetry • Sync Dot |
| [ Left Nav ]: 12 Workspaces (Dash, Intake, Graph, Txns, VASP, AI, Alerts, ...) |
| [ Main Viewport ]: SVG Graph Physics • Interactive Tables • Dossier Previews  |
| [ Drawers / Modals ]: AI Summary Drawer • OCR Review Modal • Org Req Modal    |
+-------------------------------------------------------------------------------+
                                       │
                      REST JSON / CORS (Port 3001)
                                       ▼
+-------------------------------------------------------------------------------+
|                           EXPRESS API GATEWAY & ROUTERS                       |
|  - JWT Bearer Authentication & RBAC Authorization Middleware                  |
|  - Request Body Validation & Sanitization                                      |
|  - Tamper-Evident SHA-256 Audit Logger                                        |
|  - 21 Mounted Resource Routers (/api/investigations, /api/trace, /api/v1/...) |
+-------------------------------------------------------------------------------+
                                       │
              ┌────────────────────────┴────────────────────────┐
              ▼                                                 ▼
+------------------------------------+  +-------------------------------------+
|      CORE INTELLIGENCE ENGINES     |  |     SPECIALIZED SERVICE LAYERS      |
|                                    |  |                                     |
| 1. Blockchain Provider Layer       |  | 1. OCR Evidence Ingestion Engine    |
|    - Ethereum / EVM RPC Adapter    |  |    - Multi-entity regex/heuristic   |
|    - Bitcoin UTXO / Indexer        |  |    - Confidence scoring & bounds    |
|    - BNB Chain & TRON Adapters     |  |                                     |
|                                    |  | 2. Unified Organization Request     |
| 2. Graph Traversal Engine (BFS)    |  |    - Section 91 CrPC compliance     |
|    - Multi-hop depth (1 to 3 hops) |  |    - Exchange X, WazirX, Binance,   |
|    - Directional flow analysis     |  |      HDFC Bank sandbox connectors   |
|    - Node classification taxonomy  |  |                                     |
|                                    |  | 3. Automated Record Sync Pipeline   |
| 3. Behavioural Detection Engine    |  |    - Wallet label & VASP update     |
|    - 8 Deterministic Fraud Rules   |  |    - Risk re-calculation & alerts   |
|                                    |  |    - Timeline insertion & audit log |
| 4. Explainable Risk Scoring Engine |  |                                     |
|    - Base risk + Additive penalties|  | 4. Grounded AI Summary Service      |
|    - Mathematical factor breakdown |  |    - 5-section wallet intelligence  |
|                                    |  |                                     |
| 5. Next-Hop Predictive Analytics   |  | 5. Case Narrative Synthesis Engine  |
|    - Forwarding probability & VASP |  |    - 10-section story with citations|
|                                    |  |                                     |
| 6. Clustering & Entity Resolution  |  | 6. Discovery Animation Generator    |
|    - Co-spending & deposit grouping|  |    - 5-step incremental replay flow |
+------------------------------------+  +-------------------------------------+
              │                                                 │
              └────────────────────────┬────────────────────────┘
                                       ▼
+-------------------------------------------------------------------------------+
|                              PERSISTENCE LAYER                                |
|  - SQLite Database (`backend/data/chainsentinel.db` with WAL mode)            |
|  - 17 Relational Tables: users, investigations, wallets, transactions,        |
|    entities, alerts, behaviours, predictions, evidence, requests, timeline,   |
|    sources, ocr_extractions, organization_requests, narratives, audit_logs... |
|  - Neo4j Graph Database Driver (`backend/src/graph/neo4jClient.js` fallback)  |
+-------------------------------------------------------------------------------+

================================================================================
3. EXHAUSTIVE STAGE-BY-STAGE / LINE-BY-LINE SYSTEM WORKING
================================================================================

--------------------------------------------------------------------------------
STAGE 1: Officer Authentication & Role-Based Access Control (RBAC)
--------------------------------------------------------------------------------
- Purpose: Ensure only authorized law enforcement personnel access forensic data,
  maintaining evidentiary chain of custody and accountability.
- Line-by-Line Execution Flow:
  1. Frontend: The officer enters their Badge ID (e.g. `CP-FCI-042`) and PIN in
     the login screen (`index.html: renderLogin()`). Alternatively, clicking
     "♢ Biometric Authentication" bypasses manual typing for fast hackathon demo.
  2. Network Request: The client sends a `POST /api/auth/login` HTTP request with
     JSON payload `{ officer_id: "CP-FCI-042", pin: "demo123" }`.
  3. API Router (`backend/src/routes/auth.js`):
     - Queries the `users` SQLite table for the specified `officer_id`.
     - Validates the password/PIN against the stored bcrypt hash (or fallback
       demo bypass for instant testing).
     - Checks user status (`status === 'ACTIVE'`).
  4. Token Generation: If valid, the server generates a JSON Web Token (JWT)
     signed with `JWT_SECRET`, containing:
     `{ id, officer_id, name, role, department, designation }` with 24h expiry.
  5. Response: Returns `{ token, user }`. The frontend stores the token in
     `localStorage` and memory, updates the UI topbar with the officer's badge
     and unit name, and redirects to the Executive Dashboard.
  6. Authorization Middleware (`backend/src/middleware/auth.js`):
     - Every subsequent API call includes the header `Authorization: Bearer <token>`.
     - Middleware verifies token validity and enforces role boundaries:
       * `INVESTIGATING_OFFICER`: Full case write, request generation, report export.
       * `FINANCIAL_ANALYST`: Graph analysis, behaviour detection, clustering.
       * `ADMIN`: User management, system configuration, audit review.

--------------------------------------------------------------------------------
STAGE 2: OCR Document Evidence Ingestion & Human-in-the-Loop Verification
--------------------------------------------------------------------------------
- Purpose: Convert unstructured victim documents (payment screenshots, UPI slips,
  crypto exchange deposit receipts, bank statements) into verified structured data.
- Line-by-Line Execution Flow:
  1. Frontend: In the Case Intake view or top navigation, the officer clicks
     `[📷 INGEST EVIDENCE (OCR)]` which opens `openOCRModal()`.
  2. Document Ingestion:
     - The officer either uploads an image/PDF or clicks `[⚡ Load Sample Victim Receipt]`.
     - The client sends a `POST /api/v1/evidence/ocr` request with the document data.
  3. Processing Engine (`backend/src/services/ocrService.js`):
     - Sanitizes raw text and executes specialized regex and heuristic tokenizers:
       * EVM Wallet Address: Matches `0x[a-fA-F0-9]{40}` (Confidence: 98%).
       * Bitcoin Address: Matches Bech32 `bc1...` or Base58 `(1|3)...` (Confidence: 96%).
       * Transaction Hash: Matches `0x[a-fA-F0-9]{64}` (Confidence: 95%).
       * Monetary Amount: Extracts INR (₹), USD ($), ETH, BTC, USDT (Confidence: 92%).
       * Timestamp / Date: Extracts ISO / IST datetime strings (Confidence: 90%).
       * Exchange / VASP: Matches keywords (Binance, WazirX, CoinDCX, Exchange X).
       * Payment Handle: Extracts UPI VPAs (`*@okhdfcbank`, `*@paytm`, etc.).
  4. Database Storage: Stores extraction run in `ocr_extractions` with status `PENDING_REVIEW`.
  5. Interactive Review UI:
     - The modal renders each extracted entity in a human-in-the-loop review card.
     - Each card displays: Field Name, Extracted Value, Confidence Score (e.g. 98%),
       and 3 action buttons: `[Confirm ✓]`, `[Edit ✏]`, `[Reject ✕]`.
  6. Human Confirmation:
     - Officer clicks `[Confirm ✓]`, sending `POST /api/v1/evidence/:id/confirm`
       with `{ fieldKey, status: 'CONFIRMED' }`.
     - Clicking `[🔍 Start Investigation on Detected Seed]` auto-fills the intake
       form with the verified wallet address and triggers case creation.

--------------------------------------------------------------------------------
STAGE 3: Case Intake & Multi-Chain Address Auto-Detection
--------------------------------------------------------------------------------
- Purpose: Initialize an official police case file and determine the target blockchain.
- Line-by-Line Execution Flow:
  1. Frontend: The officer enters:
     - Suspect Wallet Address (e.g. `0x7A3F1C2E4B6D8F0A123456789ABCDEF012345678`)
     - Case Priority: `CRITICAL` / `HIGH` / `MEDIUM`
     - Case Title: e.g. "Suspected Crypto Investment Fraud & Multi-Layer Fund Movement"
     - Victim Complaint Reference: e.g. `VIC-2026-089` (Reported Loss: ₹12.40 Lakh)
  2. Multi-Chain Detection (`backend/src/blockchain/index.js: detectChain(address)`):
     - Starts regex matching:
       * Starts with `0x` and 42 hex chars -> Identifies `ETHEREUM` (or EVM compatible).
       * Starts with `1`, `3`, or `bc1` -> Identifies `BITCOIN`.
       * Starts with `T` and 34 base58 chars -> Identifies `TRON`.
       * Starts with `0x` on BSC network -> Identifies `BNB_CHAIN`.
  3. API Execution: Sends `POST /api/investigations`.
  4. Database Insertion:
     - Generates unique Case ID: `CS-2026-001` (or next sequential ID).
     - Inserts record into `investigations` table.
     - Inserts the seed wallet into the `wallets` table with label `Victim Reported Seed`.
     - Logs action in `audit_logs` with Officer ID and timestamp.
  5. Response: Returns initialized investigation profile and redirects to the Graph.

--------------------------------------------------------------------------------
STAGE 4: Blockchain Provider Abstraction Layer (RPC / UTXO / Indexers)
--------------------------------------------------------------------------------
- Purpose: Provide unified access to multi-chain data regardless of underlying node protocols.
- Line-by-Line Execution Flow:
  1. Architecture: Base class `BlockchainProvider.js` defines interface contracts:
     - `getBalance(address)`
     - `getTransactions(address, options)`
     - `getTransaction(txHash)`
     - `validateAddress(address)`
  2. Concrete Implementations:
     - `EthereumProvider.js`: Communicates with EVM JSON-RPC nodes (`eth_getBalance`,
       `eth_getBlockByNumber`). Uses fallback public RPC (LlamaRPC/Cloudflare) if key missing.
     - `BitcoinProvider.js`: Queries Blockstream / Blockchain.info UTXO APIs.
     - `BNBProvider.js`: Queries Binance Smart Chain RPC endpoints.
     - `TronProvider.js`: Queries TronGrid REST APIs.
  3. Hybrid Execution Mode:
     - If live RPC credentials are configured in `.env`, fetches live on-chain data.
     - If offline / testing, seamlessly queries the deterministic local database
       pre-populated with complete test datasets, tagged with `DATA_PROVENANCE: SAMPLE`.

--------------------------------------------------------------------------------
STAGE 5: Financial Intelligence Graph & Real-Time Discovery Animation
--------------------------------------------------------------------------------
- Purpose: Reconstruct complex multi-hop fund dispersion networks visually.
- Line-by-Line Execution Flow:
  1. API Request: Frontend requests `GET /api/trace/:seed?hops=3&direction=both`.
  2. Traversal Engine (`backend/src/engine/graphTraversal.js`):
     - Implements Breadth-First Search (BFS) starting from the seed wallet.
     - Fetches outgoing and incoming transactions from `transactions` table.
     - Discovers 1-hop, 2-hop, and 3-hop counterparty wallets.
     - Node Classification:
       * `SEED`: The primary reported address (Red glowing ring).
       * `INTERMEDIARY`: Transit muling wallets (Blue nodes).
       * `VASP`: Regulated cryptocurrency exchanges (Amber square nodes).
       * `BANK`: Traditional financial off-ramps (Gray bank icon nodes).
       * `PREDICTED`: Probabilistic next destination (Purple dashed nodes).
     - Calculates edge properties: Amount, Token, Timestamp, TX Hash, and Velocity.
  3. Frontend SVG Rendering (`index.html: renderGraph()`):
     - Uses native SVG with custom force-simulation layout (zero heavy D3 bundle overhead).
     - Renders glowing nodes, curved animated flow links, and directional arrowheads.
     - Displays floating mini-HUD showing: Total Nodes, Total Edges, Fan-Out Hops.
  4. Real-Time Incremental Discovery Animation:
     - Clicking `[▶ Replay Discovery Flow]` calls `/api/v1/graph/:case_id/events`.
     - `graphAnimationService.js` returns a timed 5-step forensic replay sequence:
       * Step 1 (t = 0s): Seed Ingestion (Highlights Seed, ₹12.40L inflow from victim).
       * Step 2 (t = 2s): Rapid Fan-Out (Animates 3 split edges to Intermediaries in 4 mins).
       * Step 3 (t = 4s): Multi-Hop Layering (Animates transit hops & mixing hops).
       * Step 4 (t = 6s): VASP Convergence (Animates final consolidation into Exchange X).
       * Step 5 (t = 8s): Network Topology Locked (Highlights critical risk 94/100, 5 alerts).
     - Nodes and edges glow and pulse progressively as the timeline progresses.

--------------------------------------------------------------------------------
STAGE 6: Interactive Graph Nodes & Grounded AI Investigative Summaries
--------------------------------------------------------------------------------
- Purpose: Provide instant, hallucination-free AI intelligence upon clicking any node.
- Line-by-Line Execution Flow:
  1. Officer Interaction: Click any node on the graph (e.g. `0x7A3F1C2E4B6D8F0A123456789ABCDEF012345678`).
  2. Slide-Over Drawer: Opens `openWalletDrawer(address)` on the right side of the screen.
  3. API Request: Client calls `GET /api/v1/wallets/:address/summary`.
  4. AI Intelligence Engine (`backend/src/services/aiService.js: generateWalletSummary`):
     - Aggregates strictly verified database facts:
       * Inflow/Outflow amounts and transaction counts.
       * Associated behavioural flags (Fan-out, Velocity, Mixer, Dormancy).
       * Connected entity attributions (e.g. Exchange X Deposit Cluster).
       * Active security alerts linked to the wallet.
     - Generates 5 structured intelligence sections:
       * ⚡ 1. QUICK SUMMARY: Concise 2-sentence operational breakdown.
       * 🔍 2. KEY OBSERVATIONS: Grounded facts (e.g. "Dispensed 11.47 ETH across 3 wallets in 4 min").
       * ⚠️ 3. WHY FLAGGED?: Explicit penalty attribution (+25 Fan-Out, +20 Velocity, +10 Dormancy).
       * 🎯 4. INVESTIGATIVE SIGNIFICANCE: Actionable priority (e.g. "Prime candidate for Section 91 notice").
       * 📌 5. WHAT TO REVIEW NEXT: Direct next steps for the investigator.
       * 📜 6. GROUNDING DATA SOURCES: Direct clickable citations to TX hashes and entity records.
  5. UI Display: Renders inside the slide-over drawer with copy buttons and linkable references.

--------------------------------------------------------------------------------
STAGE 7: 8-Rule Deterministic Behavioural Fraud Pattern Detection Engine
--------------------------------------------------------------------------------
- Purpose: Automatically detect sophisticated laundering and obfuscation patterns.
- Line-by-Line Execution Flow:
  1. Engine Execution (`backend/src/engine/behaviourEngine.js`):
     Runs on case intake or transaction ingestion, evaluating 8 mathematical rules:
  2. Rule Breakdown:
     - RULE 1: RAPID FAN-OUT:
       * Condition: Single wallet sends funds to >= 3 distinct wallets within a 10-minute window.
       * Flag: `RAPID_FAN_OUT` (Severity: HIGH, Score: +25).
     - RULE 2: HIGH TRANSACTION VELOCITY:
       * Condition: Outflow velocity exceeds $50,000 USD (or equivalent) in < 1 hour.
       * Flag: `HIGH_VELOCITY` (Severity: HIGH, Score: +20).
     - RULE 3: PRIVACY MIXER / TUMBLER INTERACTION:
       * Condition: Direct transfer to/from known mixers (e.g. Tornado Cash, Blender.io).
       * Flag: `MIXER_INTERACTION` (Severity: CRITICAL, Score: +30).
     - RULE 4: CROSS-CHAIN BRIDGE HOPPING:
       * Condition: Fund transfers routing through cross-chain bridge contracts (Hop, Synapse, Multichain).
       * Flag: `CHAIN_HOPPING` (Severity: MEDIUM, Score: +15).
     - RULE 5: DORMANT WALLET REACTIVATION:
       * Condition: Wallet with 0 transactions for >= 30 days suddenly receives > $10,000.
       * Flag: `DORMANT_REACTIVATION` (Severity: MEDIUM, Score: +10).
     - RULE 6: MULTI-HOP LAYERING (PEELING CHAINS):
       * Condition: Chain of consecutive transactions with hop depth >= 3 and peeling balance.
       * Flag: `MULTI_HOP_LAYERING` (Severity: HIGH, Score: +20).
     - RULE 7: MULTI-COUNTERPARTY FAN-IN (CONSOLIDATION):
       * Condition: Single wallet aggregates funds from >= 3 distinct sources within 1 hour.
       * Flag: `FAN_IN_CONSOLIDATION` (Severity: MEDIUM, Score: +15).
     - RULE 8: IMMEDIATE FORWARDING (HOT TRANSIT):
       * Condition: Inflow funds are forwarded out in < 5 minutes leaving < 5% balance.
       * Flag: `IMMEDIATE_FORWARDING` (Severity: HIGH, Score: +20).
  3. Storage: Detected rules are inserted into `behaviours` table with timestamp and evidence refs.

--------------------------------------------------------------------------------
STAGE 8: Explainable Factor-Based Risk Scoring Model (0–100 Scale)
--------------------------------------------------------------------------------
- Purpose: Provide mathematically defensible, explainable risk ratings for court testimony.
- Line-by-Line Execution Flow:
  1. Engine Execution (`backend/src/engine/riskScoring.js`):
     - Accepts wallet address, entity category, and detected behaviours.
  2. Mathematical Model:
     - Base Risk Component:
       * `SEED_WALLET`         : 40 points
       * `MIXER_POOL`          : 50 points
       * `TRANSIT_INTERMEDIARY`: 25 points
       * `REGULATED_VASP`      : 20 points
       * `UNLABELED_WALLET`    : 15 points
     - Additive Behavioural Penalties:
       * Rapid Fan-Out         : +25 points
       * High Outflow Velocity : +20 points
       * Mixer Interaction     : +30 points
       * Cross-Chain Hopping   : +15 points
       * Dormant Reactivation  : +10 points
       * Multi-Hop Layering    : +15 points
       * Immediate Forwarding  : +15 points
     - Formula:
       `Calculated Score = BaseRisk + Sum(Penalties)`
       `Final Score = Math.min(100, Math.max(0, Calculated Score))`
  3. Risk Classification Bands:
     - `0 – 24`   : LOW RISK (Green)
     - `25 – 49`  : MEDIUM RISK (Yellow)
     - `50 – 74`  : HIGH RISK (Orange)
     - `75 – 100` : CRITICAL RISK (Red)
  4. Explainability Payload: Returns `{ score, level, factors: [ { name, weight, reason } ] }`.
     Every point is linked to a transparent reason (e.g. "+25 points due to 3-way fan-out in 4 mins").

--------------------------------------------------------------------------------
STAGE 9: VASP & Cryptocurrency Exchange Attribution & Confidence Tiers
--------------------------------------------------------------------------------
- Purpose: Identify regulated entities where stolen funds land to enable swift legal freezing.
- Line-by-Line Execution Flow:
  1. Attribution Engine: Correlates addresses against cluster heuristics and known VASP databases:
     - Known deposit address patterns.
     - Shared withdrawal hot wallets.
     - Co-spending signature clusters.
  2. Evidentiary Confidence Tiers:
     - `CONFIRMED BY SOURCE` : 100% Verified via Section 91 CrPC compliance production.
     - `STRONG ATTRIBUTION`  : > 85% Confidence via multi-input clustering & deposit memo tags.
     - `LIKELY ATTRIBUTION`  : 60–85% Confidence via shared transit hub counterparty.
     - `POTENTIAL LEAD`      : < 60% Heuristic correlation flagged for officer review.
  3. Legal Distinction: The UI highlights whether an exchange attribution is an
     unconfirmed algorithm estimate or a legally confirmed corporate response.

--------------------------------------------------------------------------------
STAGE 10: Unified Organization Request Gateway (Section 91 CrPC)
--------------------------------------------------------------------------------
- Purpose: Streamline statutory notices to crypto exchanges and banks under Indian law.
- Line-by-Line Execution Flow:
  1. Request Creation: In the Requests workspace, officer clicks `[+ New Section 91 Request]`.
  2. Input Parameters:
     - Target Organization: `Exchange X`, `WazirX`, `Binance`, or `HDFC Bank`.
     - Target Wallet / Account: Suspect deposit address or bank account.
     - Data Demanded: KYC Record, Deposit Txns, Withdrawal IPs, Bank Payouts, Account Freeze.
     - Statutory Notice Reference: Auto-generated legal citation (e.g. `CRPC-91-2026-089`).
  3. API Request: Sends `POST /api/v1/organization-requests`.
  4. Sandbox Connectors & Response Simulation:
     - `Exchange X Connector`: Returns Account ID `EX-28492`, IP logs (`182.74.x.x`), KYC Name.
     - `WazirX Connector`: Returns PAN/Aadhaar status, registered mobile, linked UPI.
     - `Binance Connector`: Returns UID `84920194`, registered email, 2FA location.
     - `HDFC Bank Connector`: Returns Account Holder, IFSC, Current Balance, Debit Freeze Status.
  5. Simulation Button: Clicking `[⚡ Simulate Response]` sends `POST /api/v1/organization-requests/:id/submit`,
     which fulfills the sandbox request with realistic forensic payloads and triggers auto-sync.

--------------------------------------------------------------------------------
STAGE 11: Automated Investigation Record Updates Pipeline
--------------------------------------------------------------------------------
- Purpose: Instantly cascade newly received organization intelligence across all case records.
- Line-by-Line Execution Flow:
  1. Pipeline Trigger (`backend/src/services/recordUpdateService.js: applyOrganizationResponse`):
     When an organization response is marked `COMPLETED`, the pipeline executes 6 automatic steps:
  2. Step 1: Upgrades Wallet Label & Metadata:
     - Updates `wallets` table: Changes label to `Exchange X Deposit (Acc: EX-28492)`.
  3. Step 2: Updates VASP Attribution Confidence:
     - Updates `wallet_entities`: Sets status to `CONFIRMED BY SOURCE`.
  4. Step 3: Recalculates Risk Score:
     - Updates risk profile taking into account confirmed exchange off-ramp status.
  5. Step 4: Creates High-Priority Security Alert:
     - Inserts into `alerts` table: "CRITICAL: Lawful Response Received from Exchange X (Acc EX-28492)".
  6. Step 5: Inserts Chronological Timeline Event:
     - Inserts into `timeline_events` with dot color `green` and source citation `[REQ-001]`.
  7. Step 6: Logs Tamper-Evident Audit Record:
     - Writes before/after diff into `audit_logs` with SHA-256 hash.
  8. Result: The entire frontend workspace reflects the updated status on the next 12s sync pulse.

--------------------------------------------------------------------------------
STAGE 12: Chronological Timeline → 10-Section AI Auto Narrative Engine
--------------------------------------------------------------------------------
- Purpose: Automatically convert raw forensic events into a coherent, cited investigative narrative.
- Line-by-Line Execution Flow:
  1. Officer Trigger: In the Timeline or Reports workspace, clicks `[⚡ AUTO NARRATIVE]`.
  2. API Request: Sends `POST /api/v1/investigations/:id/narrative/generate`.
  3. Synthesis Engine (`backend/src/services/aiService.js: generateInvestigationNarrative`):
     - Pulls all case facts: Inflow receipts, transactions, graph hops, behavioural patterns,
       risk penalties, alerts, and Section 91 responses.
     - Structures the story into 10 forensic sections:
       1. Incident Summary & Intake Facts
       2. Initial Ingestion & Seed Inflow
       3. Rapid Fund Movement & Fan-Out Analysis
       4. Intermediary Wallet Network Development
       5. Cross-Chain & Bridge Movement Telemetry
       6. VASP / Exchange Off-Ramp Attribution
       7. Suspicious Behavioural Indicators Summary
       8. Critical Alerts & Escalations Overview
       9. Organization Intelligence & Section 91 Status
       10. Recommended Next Investigative Action
  4. Interactive Citations Engine:
     - Every factual claim embeds a structured reference pill: `[🔗 Ref: TX-0x4A8F...]` or `[🔗 Ref: REQ-001]`.
     - Clicking a citation pill directly opens the corresponding wallet drawer, transaction view,
       or request modal.
  5. Storage: Narrative is saved in `narratives` table and rendered in the Timeline view.

--------------------------------------------------------------------------------
STAGE 13: Cryptographic Evidence Vault with SHA-256 Chain of Custody
--------------------------------------------------------------------------------
- Purpose: Ensure digital evidence is tamper-evident and compliant with court standards.
- Line-by-Line Execution Flow:
  1. Evidence Ingestion: When evidence is registered (OCR document, graph snapshot,
     exchange response, raw JSON log), the system creates a record in `evidence` table.
  2. Hash Computation:
     - Computes SHA-256 hash: `crypto.createHash('sha256').update(content).digest('hex')`.
     - Records Officer ID, collection timestamp, source provenance, and file size.
  3. Verification Flow:
     - Officer clicks `[Verify ✓]` next to any evidence item.
     - Sends `POST /api/evidence/:id/verify`.
     - Backend retrieves the stored content, re-computes SHA-256 hash on-the-fly,
       and compares against the stored hash.
     - Returns `{ status: 'VERIFIED', matches: true, verified_at: ISOString }`.
     - UI displays a green "✓ INTEGRITY VERIFIED (SHA-256 MATCH)" badge.

--------------------------------------------------------------------------------
STAGE 14: Probabilistic Next-Hop Predictive Analytics
--------------------------------------------------------------------------------
- Purpose: Anticipate where laundered funds will move next before criminals cash out.
- Line-by-Line Execution Flow:
  1. Predictive Engine (`backend/src/engine/predictionEngine.js`):
     - Evaluates unspent balances in intermediary wallets.
     - Analyzes historical dispersion paths of the active fraud syndicate cluster.
     - Checks forwarding velocity patterns and time-of-day activity.
  2. Probability Calculation:
     - Outputs candidate destinations with confidence ratings:
       * Destination: `Exchange X Off-Ramp Cluster` (Confidence: 78%)
       * Destination: `Tornado Cash Mixer Pool` (Confidence: 15%)
       * Destination: `P2P OTC Broker Desk` (Confidence: 7%)
  3. Strict Provenance Tagging:
     - All outputs are clearly labeled `[PREDICTED / ESTIMATED]` in the UI to ensure
       officers do not mistake analytical forecasts for verified on-chain facts.

--------------------------------------------------------------------------------
STAGE 15: 12-Section Court-Ready Forensic Dossier Generation & Export
--------------------------------------------------------------------------------
- Purpose: Produce complete, professional prosecution dossiers ready for court submission.
- Line-by-Line Execution Flow:
  1. Report Trigger: In Reports workspace, officer clicks `[Generate Court-Ready Dossier]`.
  2. API Request: Calls `GET /api/reports/:case_id`.
  3. Report Compiler (`backend/src/routes/reports.js`):
     - Compiles all case intelligence into 12 formalized forensic sections:
       * Section 1 : Case Metadata, Legal Jurisdiction & Investigating Officer Profile
       * Section 2 : Executive Summary & Victim Complaint Facts (Loss Amount, Timeline)
       * Section 3 : Victim-Reported Seed Wallet Analysis & Inflow Verification
       * Section 4 : Complete Transaction Ledger & Dispersion Table
       * Section 5 : Fund-Flow Reconstruction & Multi-Hop Path Analysis
       * Section 6 : Intermediary Wallet Network & Clustering Topology
       * Section 7 : VASP & Cryptocurrency Exchange Attribution (Confirmed vs Likely)
       * Section 8 : Behavioural Fraud Indicators & Penalty Matrix
       * Section 9 : Explainable Risk Score & Mathematical Factor Weighting
       * Section 10: Critical Security Alerts & Priority Freeze Recommendations
       * Section 11: Cross-Border & Cross-Chain Bridge Movement Telemetry
       * Section 12: Cryptographic Evidence Vault & Chain of Custody Verification Log
  4. Forensic Export: Includes official seal headers, signature lines for the
     Superintendent of Police / IO, and statutory legal disclaimers.
  5. Print / PDF: Officer clicks `[🖨 Print / Export PDF]` to trigger print styling.

--------------------------------------------------------------------------------
STAGE 16: Live Background State Synchronization & Polling
--------------------------------------------------------------------------------
- Purpose: Keep multi-analyst workspaces in continuous sync without page reloads.
- Line-by-Line Execution Flow:
  1. Client Timer: Frontend registers a 12-second background timer (`setInterval`).
  2. Sync Execution (`index.html: syncAllDataFromBackend()`):
     - Concurrently polls:
       * `GET /api/dashboard/stats` (Updates KPI metric cards)
       * `GET /api/investigations/:id` (Updates case status & funds tracked)
       * `GET /api/alerts?investigation_id=:id` (Updates alert counters)
       * `GET /api/timeline?investigation_id=:id` (Appends new timeline dots)
       * `GET /api/v1/organization-requests` (Updates request status badges)
  3. Visual Indicator: The top right telemetry pill flashes green (`● SYNCED`)
     to confirm real-time connection with the backend daemon.

================================================================================
4. COMPREHENSIVE CODEBASE & DIRECTORY STRUCTURE
================================================================================

CHAINTRACE_National_Hackathon_Prototype/
├── index.html                       # Complete Frontend Single-Page Application (HTML/CSS/JS)
├── README.txt                       # Master Line-by-Line System Documentation (This file)
├── backend/
│   ├── server.js                    # Backend HTTP Server Entrypoint (Port 3001)
│   ├── package.json                 # Project dependencies, scripts & metadata
│   ├── .env.example                 # Environment variables template
│   ├── data/
│   │   └── chainsentinel.db         # High-Performance SQLite Database File (WAL mode)
│   ├── src/
│   │   ├── app.js                   # Express application bootstrap & route mounting
│   │   ├── blockchain/              # Multi-Chain Provider Abstraction Layer
│   │   │   ├── index.js             # Provider registry & detectChain(address)
│   │   │   ├── BlockchainProvider.js# Abstract base class interface
│   │   │   ├── EthereumProvider.js  # EVM JSON-RPC provider implementation
│   │   │   ├── BitcoinProvider.js   # Bitcoin UTXO indexer implementation
│   │   │   ├── BNBProvider.js       # Binance Smart Chain provider
│   │   │   └── TronProvider.js      # TRON TRC-20 provider
│   │   ├── db/
│   │   │   ├── database.js          # SQLite singleton connection & audit logger
│   │   │   ├── schema.sql           # 17 Relational tables with indices & constraints
│   │   │   └── seed.js              # Flagship dual-case seeder (27 wallets, 14 txs)
│   │   ├── engine/                  # Core Intelligence & Forensic Engines
│   │   │   ├── riskScoring.js       # Deterministic 0-100 explainable scoring model
│   │   │   ├── graphTraversal.js    # Breadth-First Search (BFS) graph engine
│   │   │   ├── behaviourEngine.js   # 8-rule behavioural fraud pattern engine
│   │   │   ├── predictionEngine.js  # Probabilistic next-hop destination engine
│   │   │   └── clusteringEngine.js  # Co-spending wallet clustering engine
│   │   ├── graph/                   # Graph Database Service Layer
│   │   │   ├── neo4jClient.js       # Neo4j driver client with fallback
│   │   │   └── graphService.js      # Unified graph traversal query interface
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT Bearer verification & RBAC middleware
│   │   │   └── errorHandler.js      # Centralized error formatting handler
│   │   ├── services/                # Specialized Investigation Services
│   │   │   ├── ocrService.js        # OCR regex & heuristic entity extraction
│   │   │   ├── orgRequestService.js # Unified Organization Request & Sandbox gateway
│   │   │   ├── recordUpdateService.js# Automated record sync & entity resolution
│   │   │   ├── aiService.js         # Grounded AI wallet summaries & narrative
│   │   │   └── graphAnimationService.js# 5-step discovery replay generator
│   │   └── routes/                  # 21 Versioned REST API Routers
│   │       ├── auth.js              # /api/auth/login, /api/auth/me
│   │       ├── investigations.js    # /api/investigations (CRUD & intake)
│   │       ├── wallets.js           # /api/wallets, /api/wallets/:address/risk
│   │       ├── transactions.js      # /api/transactions, stats overview
│   │       ├── trace.js             # /api/trace/:seed (BFS Graph query)
│   │       ├── alerts.js            # /api/alerts, acknowledge lifecycle
│   │       ├── behaviour.js         # /api/behaviour (Pattern evaluation)
│   │       ├── predictions.js       # /api/predictions (Next-hop estimates)
│   │       ├── evidence.js          # /api/evidence, SHA-256 verification
│   │       ├── requests.js          # /api/requests (Section 91 CrPC lifecycle)
│   │       ├── timeline.js          # /api/timeline (Case event chronology)
│   │       ├── reports.js           # /api/reports/:id (12-section dossier)
│   │       ├── ocr.js               # /api/v1/evidence/ocr, confirm fields
│   │       ├── orgRequests.js       # /api/v1/organization-requests, submit
│   │       ├── ai.js                # /api/v1/wallets/:address/summary, narrative
│   │       ├── graphEvents.js       # /api/v1/graph/:case_id/events
│   │       ├── vasps.js             # /api/vasps (Exchange attribution)
│   │       ├── entities.js          # /api/entities (Entity correlations)
│   │       ├── sources.js           # /api/data-sources (Telemetry status)
│   │       ├── risk.js              # /api/risk/:address (Explainable factors)
│   │       └── dashboard.js         # /api/dashboard, crossborder, osint, audit
│   └── tests/
│       ├── unit/
│       │   └── riskScoring.test.js  # 14 Unit tests for risk scoring math
│       └── integration/
│           └── api.test.js          # 24 Integration tests for all REST endpoints

================================================================================
5. RELATIONAL DATABASE SCHEMA & DATA MODELS
================================================================================

The database is built on SQLite (WAL mode for concurrent reads/writes) with
foreign key constraints and indexing on addresses, hashes, and case IDs:

1. `users`
   - Columns: `id`, `officer_id` (UNIQUE), `name`, `email`, `password_hash`, `role`,
     `department`, `designation`, `status`, `created_at`
2. `investigations`
   - Columns: `id`, `case_number` (UNIQUE), `title`, `description`, `primary_wallet`,
     `victim_reference`, `reported_amount`, `currency`, `chain`, `priority`,
     `status`, `risk_score`, `assigned_to`, `created_at`, `updated_at`
3. `wallets`
   - Columns: `id`, `address` (UNIQUE), `chain`, `label`, `category`, `entity_id`,
     `balance`, `total_inflow`, `total_outflow`, `tx_count`, `risk_score`,
     `risk_level`, `is_monitored`, `first_seen`, `last_seen`, `created_at`
4. `transactions`
   - Columns: `id`, `tx_hash` (UNIQUE), `sender`, `receiver`, `amount`, `token_symbol`,
     `chain`, `timestamp`, `block_number`, `fee`, `status`, `notes`, `created_at`
5. `entities`
   - Columns: `id`, `name` (UNIQUE), `category`, `jurisdiction`, `risk_score`,
     `confidence_level`, `is_sanctioned`, `website`, `contact_info`, `created_at`
6. `wallet_entities`
   - Columns: `id`, `wallet_address`, `entity_name`, `confidence`, `source`,
     `verified_by`, `verified_at`, `created_at`
7. `alerts`
   - Columns: `id`, `alert_id` (UNIQUE), `investigation_id`, `wallet_address`,
     `tx_hash`, `alert_type`, `severity`, `title`, `description`, `status`,
     `created_at`, `updated_at`
8. `behaviours`
   - Columns: `id`, `investigation_id`, `wallet_address`, `pattern_name`, `severity`,
     `confidence`, `details`, `detected_at`
9. `predictions`
   - Columns: `id`, `investigation_id`, `source_wallet`, `predicted_destination`,
     `probability`, `reasoning`, `predicted_at`
10. `evidence`
    - Columns: `id`, `investigation_id`, `evidence_type`, `file_name`, `sha256_hash`,
      `description`, `collected_by`, `collected_at`, `verification_status`
11. `requests`
    - Columns: `id`, `request_id` (UNIQUE), `investigation_id`, `target_entity`,
      `request_type`, `notice_number`, `status`, `sent_at`, `response_received_at`,
      `created_at`
12. `timeline_events`
    - Columns: `id`, `investigation_id`, `event_type`, `title`, `description`,
      `timestamp`, `source_ref`, `dot_color`, `created_at`
13. `data_sources`
    - Columns: `id`, `name`, `type`, `endpoint`, `status`, `latency_ms`,
      `last_sync_at`, `is_active`
14. `ocr_extractions`
    - Columns: `id`, `investigation_id`, `file_name`, `raw_text`, `status`,
      `extracted_fields`, `created_at`
15. `organization_requests`
    - Columns: `id`, `request_id` (UNIQUE), `case_number`, `organization_name`,
      `target_type`, `target_identifier`, `purpose`, `status`, `response_payload`,
      `created_at`, `updated_at`
16. `narratives`
    - Columns: `id`, `investigation_id`, `version`, `sections_json`, `created_at`
17. `audit_logs`
    - Columns: `id`, `officer_id`, `action`, `resource_type`, `resource_id`,
      `details`, `ip_address`, `created_at`

===============================================================================
6. COMPLETE REST API ENDPOINT DIRECTORY & PAYLOADS
===============================================================================

Authentication & Health:
- `GET  /health`                                 -> System status, memory, uptime
- `GET  /ready`                                  -> Database connection readiness check
- `POST /api/auth/login`                         -> Officer login with Badge ID + PIN
- `GET  /api/auth/me`                            -> Authenticated officer profile info

Case Management & Intake:
- `GET  /api/dashboard/stats`                    -> KPI metrics, active threats, funds
- `GET  /api/investigations`                     -> List investigations (with filters)
- `POST /api/investigations`                     -> Create case & ingest seed wallet
- `GET  /api/investigations/:id`                 -> Full investigation case profile

Graph & Tracing Intelligence:
- `GET  /api/trace/:seed?hops=3&direction=both`  -> BFS graph nodes & connecting edges
- `GET  /api/v1/graph/:case_id/events`           -> 5-step incremental discovery events
- `GET  /api/wallets`                            -> List wallets with risk scores
- `GET  /api/wallets/:address`                   -> Wallet profile, balance, entities
- `GET  /api/wallets/:address/risk`              -> Explainable factor penalty breakdown
- `GET  /api/v1/wallets/:address/summary`        -> Grounded 5-section AI summary

Transactions, Behaviour & Predictions:
- `GET  /api/transactions`                       -> Transaction list with pagination
- `GET  /api/transactions/stats/overview`        -> Aggregated volume and token stats
- `GET  /api/behaviour`                          -> 8-rule detected behavioural patterns
- `GET  /api/predictions`                        -> Next-hop probabilistic forecasts
- `GET  /api/alerts`                             -> Security alerts by investigation
- `PATCH /api/alerts/:id/acknowledge`            -> Update alert status (ACK/RESOLVED)

OCR Evidence Ingestion:
- `POST /api/v1/evidence/ocr`                    -> Upload document & extract entities
- `GET  /api/v1/evidence/:id/extractions`        -> Retrieve extracted confidence fields
- `POST /api/v1/evidence/:id/confirm`            -> Confirm, edit, or reject OCR field

Organization Requests & Section 91 CrPC:
- `GET  /api/v1/organization-requests`           -> List Section 91 CrPC requests
- `POST /api/v1/organization-requests`           -> Register new organization request
- `POST /api/v1/organization-requests/:id/submit`-> Fulfill request via sandbox connector
- `POST /api/v1/organization-requests/:id/response`-> Trigger automated case record sync

Timeline, AI Narrative & Forensic Reports:
- `GET  /api/timeline`                           -> Chronological case event stream
- `GET  /api/v1/investigations/:id/narrative`    -> Fetch synthesized case narrative
- `POST /api/v1/investigations/:id/narrative/generate` -> Synthesize 10-section AI narrative
- `GET  /api/evidence`                           -> List evidence items in vault
- `POST /api/evidence`                           -> Register evidence item
- `POST /api/evidence/:id/verify`                -> Verify SHA-256 cryptographic hash
- `GET  /api/reports/:case_id`                   -> Generate 12-section court dossier

Attribution, OSINT & Audit Trail:
- `GET  /api/vasps`                              -> Cryptocurrency exchange directory
- `GET  /api/entities`                           -> Entity correlation records
- `GET  /api/sources`                            -> Blockchain RPC & telemetry status
- `GET  /api/crossborder`                        -> Cross-chain bridge telemetry
- `GET  /api/osint`                              -> OSINT intelligence captures
- `GET  /api/audit`                              -> Tamper-evident officer audit logs

================================================================================
7. FLAGSHIP DEMONSTRATION SCENARIOS & TEST ACCOUNTS
================================================================================

SCENARIO 1: Primary Flagship Investigation (Case CS-2026-001)
-------------------------------------------------------------
- Case Title    : Suspected Crypto Investment Fraud & Multi-Layer Fund Movement
- Seed Wallet   : 0x7A3F1C2E4B6D8F0A123456789ABCDEF012345678
- Victim Ref    : VIC-2026-089 (Reported Loss: ₹12.40 Lakh / 14.85 ETH)
- Narrative Walkthrough:
  1. Officer reviews victim receipt via OCR Ingestion (`[📷 INGEST EVIDENCE (OCR)]`).
  2. Confirms detected seed address `0x7A3F1C2E4B6D8F0A123456789ABCDEF012345678`.
  3. Replays graph discovery flow (`[▶ Replay Discovery Flow]`).
  4. Clicks seed wallet to view AI Investigative Summary (+25 Fan-Out, +20 Velocity).
  5. Inspects Section 91 CrPC request for Exchange X.
  6. Simulates exchange compliance response (`[⚡ Simulate Response]`), which
     identifies Account `EX-28492` belonging to Attributed Entity Alpha.
  7. Observes automated case record update across alerts, timeline, and risk scores.
  8. Generates AI Auto Narrative (`[⚡ AUTO NARRATIVE]`) with clickable citations.
  9. Verifies SHA-256 evidence hash in Cryptographic Vault.
  10. Exports 12-Section Court-Ready Forensic Dossier.

SCENARIO 2: Multi-Hop Fraud Syndicate Cluster (Case CS-2026-002)
----------------------------------------------------------------
- Case Title    : Cross-Border Digital Asset Fraud & Multi-Branch Laundering
- Seed Wallet   : 0xFRAUD_ORIGIN_A1B2C3D4E5F6
- Overview      :
  1. Multi-branch laundering syndicate spanning 27 wallet nodes and 14 transactions.
  2. Demonstrates cross-chain hopping (Ethereum -> TRON TRC20 -> Binance).
  3. Evaluates privacy mixing penalties (+30 Tornado Cash interaction).
  4. Overall Risk Score: 100/100 (CRITICAL).

================================================================================
8. AUTOMATED VERIFICATION & TEST SUITE (38/38 TESTS PASSING)
================================================================================

The backend includes a comprehensive automated test suite built with Jest and
Supertest.

To execute the entire test suite:
$ cd backend && npm test

Test Breakdown:
1. Unit Tests (`tests/unit/riskScoring.test.js` - 14 Tests):
   - Validates risk score clamping between 0 and 100.
   - Validates base risk by entity category (Seed: 40, Mixer: 50, VASP: 20, Transit: 25).
   - Validates additive penalty mathematics for all 8 behavioural patterns.
   - Tests risk level categorization (LOW, MEDIUM, HIGH, CRITICAL).
   - Validates explainable factor weighting arrays.

2. Integration Tests (`tests/integration/api.test.js` - 24 Tests):
   - Health and readiness endpoints return HTTP 200.
   - User authentication verifies credentials and issues valid JWTs.
   - Role-Based Access Control enforces endpoint permissions.
   - Case creation registers new investigations and seeds wallets.
   - BFS graph traversal returns structured nodes, edges, and classifications.
   - OCR pipeline extracts wallet addresses, TX hashes, amounts, and dates.
   - Organization requests submit and auto-update investigation state.
   - AI wallet summaries return evidence-grounded observations.
   - AI narrative engine synthesizes 10 structured sections with citations.
   - SHA-256 evidence integrity hashing verifies without tampering.

================================================================================
9. DATA PROVENANCE & LEGAL INTEGRITY STANDARDS
================================================================================

ChainTrace is built in strict adherence to digital evidence standards (Section 65B
of the Indian Evidence Act / Bharatiya Sakshya Adhiniyam):

1. Explicit Data Provenance Labels:
   - `[OBSERVED]`   : Public on-chain ledger facts directly verified on blockchain nodes.
   - `[DETECTED]`   : Algorithmic indicators flagged by deterministic behavioural rules.
   - `[PREDICTED]`  : Probabilistic next-hop estimates explicitly tagged as non-factual.
   - `[AUTHORIZED]` : Official Section 91 CrPC production responses from organizations.
   - `[SAMPLE]`     : Coherent simulation dataset for hackathon demonstration.

2. Human-in-the-Loop Requirement:
   - AI algorithms and heuristic engines serve strictly as investigative decision support.
   - Final investigative conclusions, statutory notices, account freezing orders,
     and charge-sheet filings remain authorized and executed by certified officers.

3. Cryptographic Chain of Custody:
   - Every piece of evidence, document extraction, and audit log entry is protected
     by immutable SHA-256 cryptographic hashing.
================================================================================
