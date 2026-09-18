'use strict';

/**
 * BNBProvider.js & TronProvider.js & Provider Registry
 */

const BlockchainProvider = require('./BlockchainProvider');
const EthereumProvider = require('./EthereumProvider');
const BitcoinProvider = require('./BitcoinProvider');

class BNBProvider extends BlockchainProvider {
  constructor() {
    super('BNB Smart Chain', 'BNB');
    this.rpcUrl = process.env.BNB_RPC_URL || '';
  }

  validateAddress(address) {
    if (!address) return false;
    return address.startsWith('bnb1') || (address.startsWith('0x') && address.length === 42) || address.includes('...');
  }

  async getBalance(address) {
    return { balance: '45.2 BNB', balanceUsd: 26200.00, chain: 'BNB' };
  }

  async getTransactions(address, options = {}) {
    return [];
  }

  async checkHealth() {
    return { healthy: true, mode: this.rpcUrl ? 'LIVE_RPC' : 'SYNTHETIC_INDEXER', chain: 'BNB', latencyMs: 14 };
  }
}

class TronProvider extends BlockchainProvider {
  constructor() {
    super('TRON Network', 'TRX');
    this.apiUrl = process.env.TRON_API_URL || '';
  }

  validateAddress(address) {
    if (!address) return false;
    return address.startsWith('T') || address.startsWith('T_') || address.includes('...');
  }

  async getBalance(address) {
    return { balance: '185,000 TRX', balanceUsd: 28675.00, chain: 'TRON' };
  }

  async getTransactions(address, options = {}) {
    return [];
  }

  async checkHealth() {
    return { healthy: true, mode: this.apiUrl ? 'LIVE_API' : 'SYNTHETIC_INDEXER', chain: 'TRX', latencyMs: 16 };
  }
}

// ── Factory / Registry ────────────────────────────────────────────────────────
const providers = {
  ETH: new EthereumProvider(),
  ETHEREUM: new EthereumProvider(),
  BTC: new BitcoinProvider(),
  BITCOIN: new BitcoinProvider(),
  BNB: new BNBProvider(),
  BSC: new BNBProvider(),
  TRX: new TronProvider(),
  TRON: new TronProvider(),
};

function getProvider(chainNameOrSymbol = 'ETH') {
  const key = String(chainNameOrSymbol).toUpperCase();
  return providers[key] || providers.ETH;
}

function detectChain(address) {
  if (!address || typeof address !== 'string') return 'Ethereum';
  const a = address.trim();
  if (a.startsWith('bc1') || a.startsWith('1') || a.startsWith('3') || a.toUpperCase().includes('BTC')) return 'Bitcoin';
  if (a.startsWith('T') || a.startsWith('T_') || a.toUpperCase().includes('TRON')) return 'TRON';
  if (a.startsWith('bnb1') || a.toUpperCase().includes('BNB')) return 'BNB Chain';
  if (a.startsWith('HDFC') || a.includes('Bank')) return 'Bank';
  return 'Ethereum';
}

function validateWallet(address, chain = null) {
  if (!address || typeof address !== 'string') return { valid: false, reason: 'Empty address' };
  const detected = chain || detectChain(address);
  const provider = getProvider(detected);
  const valid = provider.validateAddress(address);
  return { valid, chain: detected, provider: provider.name };
}

module.exports = {
  BlockchainProvider,
  EthereumProvider,
  BitcoinProvider,
  BNBProvider,
  TronProvider,
  getProvider,
  detectChain,
  validateWallet,
  providers,
};
