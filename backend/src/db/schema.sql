-- =========================================================
-- ChainSentinel Database Schema
-- Financial Intelligence Graph & Behavioural Risk Engine
-- =========================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------------------------------------------------------
-- WALLETS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  address     TEXT     NOT NULL UNIQUE,
  chain       TEXT     NOT NULL DEFAULT 'ETH',       -- ETH | BTC | TRX | BNB | SOL
  type        TEXT     NOT NULL DEFAULT 'Unknown',   -- EOA | Exchange | Mixer | DeFi | Bridge | Unknown
  label       TEXT,                                  -- Human-readable tag / alias
  entity      TEXT,                                  -- Known entity (e.g. "Binance Hot Wallet")
  base_risk   REAL     NOT NULL DEFAULT 0.0          -- Static seed risk 0-100
                       CHECK (base_risk >= 0 AND base_risk <= 100),
  flagged     INTEGER  NOT NULL DEFAULT 0,           -- 1 = manually flagged by investigator
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wallets_address   ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_type      ON wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_chain     ON wallets(chain);
CREATE INDEX IF NOT EXISTS idx_wallets_base_risk ON wallets(base_risk DESC);

-- ---------------------------------------------------------
-- TRANSACTIONS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  tx_hash      TEXT     NOT NULL UNIQUE,
  sender       TEXT     NOT NULL REFERENCES wallets(address) ON DELETE CASCADE,
  receiver     TEXT     NOT NULL REFERENCES wallets(address) ON DELETE CASCADE,
  amount       REAL     NOT NULL CHECK (amount >= 0),  -- USD-denominated value
  token        TEXT     NOT NULL DEFAULT 'ETH',        -- ETH | BTC | USDT | BNB | SOL
  timestamp    DATETIME NOT NULL,
  block_number INTEGER,
  fee          REAL     DEFAULT 0.0,
  flagged      INTEGER  NOT NULL DEFAULT 0,            -- 1 = suspicious transaction
  notes        TEXT,                                   -- Investigator annotations
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_hash       ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_sender     ON transactions(sender);
CREATE INDEX IF NOT EXISTS idx_tx_receiver   ON transactions(receiver);
CREATE INDEX IF NOT EXISTS idx_tx_timestamp  ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tx_amount     ON transactions(amount DESC);
CREATE INDEX IF NOT EXISTS idx_tx_flagged    ON transactions(flagged);

-- Composite index for hop traversal queries (sender+timestamp most common pattern)
CREATE INDEX IF NOT EXISTS idx_tx_sender_ts  ON transactions(sender, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tx_recv_ts    ON transactions(receiver, timestamp DESC);

-- ---------------------------------------------------------
-- RISK CACHE (pre-computed scores for performance)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_cache (
  address      TEXT     PRIMARY KEY REFERENCES wallets(address) ON DELETE CASCADE,
  risk_score   REAL     NOT NULL DEFAULT 0.0,
  flags        TEXT     NOT NULL DEFAULT '[]',   -- JSON array of detected behaviour strings
  computed_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- INVESTIGATIONS (case management)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigations (
  id           INTEGER  PRIMARY KEY AUTOINCREMENT,
  case_id      TEXT     NOT NULL UNIQUE,
  title        TEXT     NOT NULL,
  seed_address TEXT     NOT NULL,
  status       TEXT     NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | CLOSED | ARCHIVED
  officer_id   TEXT,
  notes        TEXT,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);
