ChainSentinel — Financial Crime Investigation Platform
======================================================
Chandigarh Police • Financial Cyber Intelligence Division

A full-stack financial intelligence platform for tracing crypto fund-flows,
detecting behavioural fraud patterns, and building court-ready investigation reports.

─────────────────────────────────────────────────────────────
QUICK START
─────────────────────────────────────────────────────────────

1. Start the backend (Terminal 1):
   cd backend
   npm install
   node src/db/seed.js        ← populate mock fraud cluster (first run only)
   npm run dev                ← starts API on http://localhost:3001

2. Serve the frontend (Terminal 2):
   python3 -m http.server 5500
   → Open: http://localhost:5500/index.html

Demo Credentials:
  Officer ID : CP-FCI-042
  Password   : demo123
  Biometric  : Click "Fingerprint" for instant sign-in

─────────────────────────────────────────────────────────────
ARCHITECTURE
─────────────────────────────────────────────────────────────

Frontend  →  index.html (single-file SPA, vanilla JS + SVG graph)
Backend   →  Node.js + Express + SQLite (better-sqlite3)

backend/
  src/
    db/          schema.sql · database.js · seed.js
    engine/      riskScoring.js · graphTraversal.js
    routes/      trace.js · wallets.js · transactions.js
    middleware/  errorHandler.js
  tests/unit/    riskScoring.test.js (19 tests)
  server.js

─────────────────────────────────────────────────────────────
BACKEND API
─────────────────────────────────────────────────────────────

GET  /health                                     Health check
GET  /api/trace/:seed?hops=3&direction=both      Graph traversal → {nodes[], edges[]}
GET  /api/trace/:seed/summary                    KPI summary (node/edge counts, top flags)
GET  /api/wallets                                List wallets (filter: type, chain, minRisk, q)
GET  /api/wallets/:address/risk                  Dynamic risk score + behaviour flags
GET  /api/wallets/:address/transactions          Paginated transaction history
GET  /api/transactions                           Transaction log (multi-filter + pagination)
GET  /api/transactions/stats/overview            Aggregate volume + token breakdown
POST /api/seed                                   Re-seed database (dev only)

─────────────────────────────────────────────────────────────
BEHAVIOURAL RISK ENGINE
─────────────────────────────────────────────────────────────

5 detectors run automatically on every traced wallet:

  Rapid Fan-Out         >= 3 unique receivers within 10 minutes    +25 pts
  High Velocity         > $50k outflow in any 1-hour window        +20 pts
  Mixer Interaction     Direct link to a known mixing service       +30 pts
  Chain Hopping         Transactions span >= 2 different chains     +15 pts
  Dormant Reactivation  > 30-day gap then sudden activity burst     +10 pts

Score = clamp(base_risk + penalties, 0, 100)
19/19 unit tests passing.

─────────────────────────────────────────────────────────────
MOCK FRAUD CLUSTER (seed.js)
─────────────────────────────────────────────────────────────

Layer 0  FRAUD_ORIGIN  (score 100 — Fan-Out + Velocity + Mixer)
Layer 1  3x Distribution wallets  (rapid fan-out within 8 min)
Layer 2  2x Mixer/Tumbler wallets (ETH smart contract + TRON)
Layer 3  5x Cash-out / OTC wallets  → Binance / Kraken / Coinbase

+ Dormant reactivation cluster (45-day gap then burst of 4 txs)
+ Legitimate exchange baseline wallets for contrast

Total: 18 wallets · 42 transactions · $1,724,250 USD volume

─────────────────────────────────────────────────────────────
KEY FEATURES
─────────────────────────────────────────────────────────────

 1. Investigation Command Center — KPIs, alerts, fund-flow overview
 2. Interactive Financial Intelligence Graph — pan/zoom/click, live API
 3. Explainable Risk Scoring — deterministic score from observable signals
 4. Behavioural Pattern Detection — fan-out, velocity, mixing, chain-hop, dormancy
 5. Predictive Fund-Flow Engine — next-hop prediction with confidence %
 6. Lawful Data Requests — lifecycle tracking (DRAFT → VALIDATED)
 7. Forensic Evidence Vault — integrity hashes, chain of custody
 8. Chronological Case Timeline — auto-reconstructed from events
 9. 12-Section Structured Reports — OBSERVED / DETECTED / PREDICTED
10. Sentinel Guide — anime-inspired assistant with guided walkthrough
11. Role-Based Access — IO / Financial Analyst / Administrator

─────────────────────────────────────────────────────────────
IMPORTANT
─────────────────────────────────────────────────────────────

This is a demonstration prototype utilising coherent simulated data.
All predictions and behavioural indicators are decision-support tools
requiring human investigator verification before any operational use.
