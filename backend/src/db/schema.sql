-- =========================================================
-- ChainTrace / ChainSentinel Database Schema
-- Financial Intelligence Graph & Behavioural Risk Engine
-- =========================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------------------------------------------------------
-- OFFICERS / USERS & RBAC
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  officer_id    TEXT     NOT NULL UNIQUE,
  name          TEXT     NOT NULL,
  role          TEXT     NOT NULL DEFAULT 'IO',       -- ADMIN | IO | ANALYST | VIEWER
  unit          TEXT     NOT NULL DEFAULT 'Financial Cyber Intelligence Division',
  password_hash TEXT     NOT NULL,
  status        TEXT     NOT NULL DEFAULT 'ONLINE',   -- ONLINE | OFFLINE
  last_active   DATETIME NOT NULL DEFAULT (datetime('now')),
  created_at    DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_officer_id ON users(officer_id);

-- ---------------------------------------------------------
-- INVESTIGATIONS / CASES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigations (
  id                    INTEGER  PRIMARY KEY AUTOINCREMENT,
  case_id               TEXT     NOT NULL UNIQUE,
  title                 TEXT     NOT NULL,
  description           TEXT,
  status                TEXT     NOT NULL DEFAULT 'INVESTIGATING', -- OPEN | INVESTIGATING | EVIDENCE REVIEW | ON_HOLD | CLOSED
  priority              TEXT     NOT NULL DEFAULT 'HIGH',          -- LOW | MEDIUM | HIGH | CRITICAL
  risk_score            REAL     NOT NULL DEFAULT 0.0,
  risk_level            TEXT     NOT NULL DEFAULT 'LOW',
  seed_address          TEXT     NOT NULL,
  seed_type             TEXT     NOT NULL DEFAULT 'wallet',        -- wallet | tx | case
  blockchain            TEXT     NOT NULL DEFAULT 'Ethereum',
  created_by            TEXT     NOT NULL DEFAULT 'CP-FCI-042',
  assigned_investigator TEXT     NOT NULL DEFAULT 'CP-FCI-042',
  victim_ref            TEXT,
  funds                 TEXT     DEFAULT '₹0',
  tags                  TEXT     DEFAULT '[]',                     -- JSON array
  notes                 TEXT,
  source_mode           TEXT     NOT NULL DEFAULT 'DEMO',          -- LIVE | DEMO
  created_at            DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at            DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inv_case_id    ON investigations(case_id);
CREATE INDEX IF NOT EXISTS idx_inv_status     ON investigations(status);
CREATE INDEX IF NOT EXISTS idx_inv_priority   ON investigations(priority);
CREATE INDEX IF NOT EXISTS idx_inv_created_at ON investigations(created_at DESC);

-- ---------------------------------------------------------
-- WALLETS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  address      TEXT     NOT NULL UNIQUE,
  chain        TEXT     NOT NULL DEFAULT 'ETH',       -- ETH | BTC | TRX | BNB | SOL | Bank
  type         TEXT     NOT NULL DEFAULT 'Unknown',   -- EOA | Exchange | Mixer | DeFi | Bridge | Seed Wallet | Transfer Wallet | Intermediate Wallet | Linked Wallet | Unknown
  label        TEXT,                                  -- Human-readable tag / alias
  entity       TEXT,                                  -- Known entity (e.g. "Binance Hot Wallet", "Exchange X")
  balance      TEXT     DEFAULT '—',
  inflow       TEXT     DEFAULT '—',
  outflow      TEXT     DEFAULT '—',
  tx_count     INTEGER  DEFAULT 0,
  first_seen   TEXT     DEFAULT '—',
  last_seen    TEXT     DEFAULT '—',
  base_risk    REAL     NOT NULL DEFAULT 0.0
                        CHECK (base_risk >= 0 AND base_risk <= 100),
  risk_score   REAL     DEFAULT 0.0,
  risk_level   TEXT     DEFAULT 'LOW',
  flagged      INTEGER  NOT NULL DEFAULT 0,           -- 1 = flagged
  confidence   TEXT     DEFAULT 'CONFIRMED',          -- CONFIRMED | STRONG | LIKELY | POTENTIAL | UNVERIFIED
  created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wallets_address   ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_type      ON wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_chain     ON wallets(chain);
CREATE INDEX IF NOT EXISTS idx_wallets_base_risk ON wallets(base_risk DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_risk_score ON wallets(risk_score DESC);

-- ---------------------------------------------------------
-- TRANSACTIONS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  tx_hash      TEXT     NOT NULL UNIQUE,
  sender       TEXT     NOT NULL REFERENCES wallets(address) ON DELETE CASCADE,
  receiver     TEXT     NOT NULL REFERENCES wallets(address) ON DELETE CASCADE,
  amount       REAL     NOT NULL CHECK (amount >= 0),  -- USD / INR value
  value_display TEXT,                                  -- e.g. "₹12,40,000" or "$15,000"
  token        TEXT     NOT NULL DEFAULT 'USDT',       -- ETH | BTC | USDT | BNB | TRX
  chain        TEXT     NOT NULL DEFAULT 'Ethereum',
  timestamp    DATETIME NOT NULL,
  block_number INTEGER,
  fee          REAL     DEFAULT 0.0,
  flagged      INTEGER  NOT NULL DEFAULT 0,            -- 1 = suspicious
  provenance   TEXT     NOT NULL DEFAULT 'OBSERVED',   -- OBSERVED | DETECTED | PREDICTED | SAMPLE | AUTHORIZED
  notes        TEXT,
  case_id      TEXT,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_hash       ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_sender     ON transactions(sender);
CREATE INDEX IF NOT EXISTS idx_tx_receiver   ON transactions(receiver);
CREATE INDEX IF NOT EXISTS idx_tx_timestamp  ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tx_amount     ON transactions(amount DESC);
CREATE INDEX IF NOT EXISTS idx_tx_flagged    ON transactions(flagged);
CREATE INDEX IF NOT EXISTS idx_tx_sender_ts  ON transactions(sender, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tx_recv_ts    ON transactions(receiver, timestamp DESC);

-- ---------------------------------------------------------
-- ENTITIES & VASPS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id                  INTEGER  PRIMARY KEY AUTOINCREMENT,
  name                TEXT     NOT NULL UNIQUE,
  entity_type         TEXT     NOT NULL DEFAULT 'Exchange', -- Exchange | Mixer | Bank | Bridge | VASP
  category            TEXT     DEFAULT 'Regulated VASP',
  jurisdiction        TEXT     DEFAULT 'International',
  risk_level          TEXT     DEFAULT 'MEDIUM',            -- LOW | MEDIUM | HIGH | CRITICAL
  attribution_source  TEXT     DEFAULT 'Internal Intelligence & Public Registries',
  confidence          TEXT     NOT NULL DEFAULT 'STRONG',   -- CONFIRMED | STRONG | LIKELY | POTENTIAL | UNVERIFIED
  verified            INTEGER  NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- ALERTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id               TEXT     PRIMARY KEY,
  case_id          TEXT     NOT NULL,
  wallet_address   TEXT,
  tx_hash          TEXT,
  alert_type       TEXT     NOT NULL,
  level            TEXT     NOT NULL DEFAULT 'HIGH', -- LOW | MEDIUM | HIGH | CRITICAL
  title            TEXT     NOT NULL,
  description      TEXT     NOT NULL,
  risk_score       REAL     NOT NULL DEFAULT 80.0,
  status           TEXT     NOT NULL DEFAULT 'NEW',  -- NEW | ACKNOWLEDGED | RESOLVED | DISMISSED
  indicators       TEXT     DEFAULT '[]',            -- JSON array
  created_at       DATETIME NOT NULL DEFAULT (datetime('now')),
  acknowledged_at  DATETIME,
  acknowledged_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_case_id ON alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_level   ON alerts(level);
CREATE INDEX IF NOT EXISTS idx_alerts_status  ON alerts(status);

-- ---------------------------------------------------------
-- BEHAVIOURAL PATTERNS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS behaviours (
  id          TEXT     PRIMARY KEY,
  case_id     TEXT     NOT NULL,
  name        TEXT     NOT NULL,
  severity    TEXT     NOT NULL DEFAULT 'HIGH', -- LOW | MEDIUM | HIGH | CRITICAL
  entity      TEXT     NOT NULL,
  time_range  TEXT     NOT NULL,
  description TEXT     NOT NULL,
  evidence    TEXT     NOT NULL DEFAULT '[]',   -- JSON array of evidence strings
  created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_behaviours_case_id ON behaviours(case_id);

-- ---------------------------------------------------------
-- PREDICTIONS (ANALYTICAL NEXT-HOP ESTIMATES)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  case_id       TEXT     NOT NULL,
  source_wallet TEXT,
  dest          TEXT     NOT NULL,
  conf          INTEGER  NOT NULL DEFAULT 50,
  reason        TEXT     NOT NULL,
  basis         TEXT     NOT NULL,
  label         TEXT     NOT NULL DEFAULT 'PREDICTED',
  sources       TEXT     NOT NULL DEFAULT '[]', -- JSON array
  created_at    DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_predictions_case_id ON predictions(case_id);

-- ---------------------------------------------------------
-- EVIDENCE VAULT
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence (
  id           TEXT     PRIMARY KEY,
  case_id      TEXT     NOT NULL,
  type         TEXT     NOT NULL,
  source       TEXT     NOT NULL,
  entity       TEXT     NOT NULL,
  tx_ref       TEXT,
  collected_at TEXT     NOT NULL,
  collected_by TEXT     NOT NULL DEFAULT 'CP-FCI-042',
  hash         TEXT     NOT NULL,
  status       TEXT     NOT NULL DEFAULT 'Collected', -- Collected | Reviewed | Verified
  notes        TEXT,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);

-- ---------------------------------------------------------
-- DATA REQUESTS (LAWFUL REQUESTS LIFECYCLE)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS requests (
  id          TEXT     PRIMARY KEY,
  case_id     TEXT     NOT NULL,
  org         TEXT     NOT NULL,
  info        TEXT     NOT NULL,
  legal       TEXT     NOT NULL DEFAULT 'Section 91 CrPC — Production of documents',
  priority    TEXT     NOT NULL DEFAULT 'HIGH',      -- LOW | MEDIUM | HIGH | CRITICAL
  status      TEXT     NOT NULL DEFAULT 'PENDING',   -- DRAFT | PENDING | SENT | RECEIVED | VALIDATED | ADDED TO CASE
  created_by  TEXT     NOT NULL DEFAULT 'CP-FCI-042',
  created_at  TEXT     NOT NULL,
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_requests_case_id ON requests(case_id);
CREATE INDEX IF NOT EXISTS idx_requests_status  ON requests(status);

-- ---------------------------------------------------------
-- TIMELINE EVENTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS timeline_events (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  case_id     TEXT     NOT NULL,
  time        TEXT     NOT NULL,
  date        TEXT     NOT NULL,
  event       TEXT     NOT NULL,
  detail      TEXT     NOT NULL,
  source      TEXT     NOT NULL,
  dot         TEXT     NOT NULL DEFAULT 'blue', -- blue | orange | red | purple | green
  ref         TEXT,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timeline_case_id ON timeline_events(case_id);

-- ---------------------------------------------------------
-- DATA SOURCES & HEALTH
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_sources (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  name          TEXT     NOT NULL UNIQUE,
  type          TEXT     NOT NULL,
  sync_status   TEXT     NOT NULL DEFAULT 'Live',
  records_count INTEGER  NOT NULL DEFAULT 0,
  prov_type     TEXT     NOT NULL DEFAULT 'OBSERVED',
  is_active     INTEGER  NOT NULL DEFAULT 1,
  last_sync     DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- OSINT RECORDS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS osint_records (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  case_id      TEXT,
  title        TEXT     NOT NULL,
  entity       TEXT     NOT NULL,
  confidence   TEXT     NOT NULL DEFAULT 'Unverified',
  source       TEXT     NOT NULL,
  captured_at  TEXT     NOT NULL,
  notes        TEXT,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- CROSS-BORDER & CROSS-CHAIN MOVEMENTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS cross_border (
  id               INTEGER  PRIMARY KEY AUTOINCREMENT,
  case_id          TEXT     NOT NULL,
  source_country   TEXT     NOT NULL DEFAULT 'India',
  dest_country     TEXT     NOT NULL DEFAULT 'UAE',
  hub_name         TEXT     DEFAULT 'UAE Exchange Hub',
  bridge_mechanism TEXT     DEFAULT 'TRC20 / Cross-Chain Bridge',
  source_chain     TEXT     DEFAULT 'Ethereum',
  dest_chain       TEXT     DEFAULT 'TRON',
  amount_usd       REAL     DEFAULT 0.0,
  tx_hash          TEXT,
  confidence       TEXT     DEFAULT 'PROBABLE',
  notes            TEXT,
  created_at       DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- AUDIT LOGS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT     NOT NULL,
  officer_id    TEXT     NOT NULL,
  action        TEXT     NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  result        TEXT     NOT NULL DEFAULT 'Success',
  ip_address    TEXT     DEFAULT '127.0.0.1',
  metadata      TEXT     DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_officer   ON audit_logs(officer_id);

-- ---------------------------------------------------------
-- RISK CACHE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_cache (
  address      TEXT     PRIMARY KEY,
  risk_score   REAL     NOT NULL DEFAULT 0.0,
  flags        TEXT     NOT NULL DEFAULT '[]',   -- JSON array
  computed_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- OCR EVIDENCE EXTRACTIONS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ocr_extractions (
  id                TEXT     PRIMARY KEY,
  case_id           TEXT     NOT NULL,
  document_name     TEXT     NOT NULL,
  document_type     TEXT     NOT NULL DEFAULT 'IMAGE', -- IMAGE | PDF | SCREENSHOT | RECEIPT
  raw_text          TEXT     NOT NULL DEFAULT '',
  extracted_fields  TEXT     NOT NULL DEFAULT '[]',    -- JSON array of fields with confidence & status
  status            TEXT     NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW | CONFIRMED | REJECTED | PROCESSED
  uploaded_by       TEXT     NOT NULL DEFAULT 'CP-FCI-042',
  created_at        DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ocr_case_id ON ocr_extractions(case_id);

-- ---------------------------------------------------------
-- UNIFIED ORGANIZATION REQUESTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_requests (
  id                   TEXT     PRIMARY KEY, -- e.g. OR-00101
  case_id              TEXT     NOT NULL,
  organization_id      TEXT     NOT NULL,
  organization_name    TEXT     NOT NULL,
  request_type         TEXT     NOT NULL,   -- KYC | WALLET_OWNERSHIP | TRANSACTION_DETAILS | FREEZE_REQUEST
  requested_fields     TEXT     NOT NULL DEFAULT '[]', -- JSON array
  wallet_address       TEXT,
  transaction_hash     TEXT,
  reference_ids        TEXT     DEFAULT '{}',
  reason               TEXT     NOT NULL DEFAULT 'Section 91 CrPC Investigation',
  priority             TEXT     NOT NULL DEFAULT 'HIGH', -- LOW | MEDIUM | HIGH | CRITICAL
  status               TEXT     NOT NULL DEFAULT 'SUBMITTED', -- DRAFT | SUBMITTED | PROCESSING | RESPONSE_RECEIVED | COMPLETED
  response_received_at TEXT,
  response_source      TEXT     DEFAULT 'SANDBOX_ORGANIZATION',
  response_data        TEXT     DEFAULT '{}', -- JSON object
  records_updated      INTEGER  DEFAULT 0,
  created_by           TEXT     NOT NULL DEFAULT 'CP-FCI-042',
  created_at           TEXT     NOT NULL,
  updated_at           DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_org_req_case_id ON organization_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_org_req_status  ON organization_requests(status);

-- ---------------------------------------------------------
-- CASE INVESTIGATION NARRATIVES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS narratives (
  id                  INTEGER  PRIMARY KEY AUTOINCREMENT,
  case_id             TEXT     NOT NULL,
  title               TEXT     NOT NULL,
  incident_summary    TEXT     NOT NULL,
  narrative_body      TEXT     NOT NULL,
  structured_sections TEXT     NOT NULL DEFAULT '[]', -- JSON array of sections with citations
  source_citations    TEXT     NOT NULL DEFAULT '[]', -- JSON array
  version             INTEGER  NOT NULL DEFAULT 1,
  generated_by        TEXT     NOT NULL DEFAULT 'AI_NARRATIVE_ENGINE',
  created_at          DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_narratives_case_id ON narratives(case_id);
