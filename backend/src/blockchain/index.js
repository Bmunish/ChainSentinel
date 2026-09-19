'use strict';

/**
 * blockchain/index.js
 * Central Provider Registry, Chain Detection, and On-Chain Fetch Helper.
 */

const BlockchainProvider = require('./BlockchainProvider');
const EthereumProvider = require('./EthereumProvider');
const BitcoinProvider = require('./BitcoinProvider');
const BNBProvider = require('./BNBProvider');
const TronProvider = require('./TronProvider');

// ── Instantiate Singleton Providers ───────────────────────────────────────────
const ethProvider = new EthereumProvider();
const btcProvider = new BitcoinProvider();
const bnbProvider = new BNBProvider();
const trxProvider = new TronProvider();

const providers = {
  ETH: ethProvider,
  ETHEREUM: ethProvider,
  BTC: btcProvider,
  BITCOIN: btcProvider,
  BNB: bnbProvider,
  BSC: bnbProvider,
  'BNB CHAIN': bnbProvider,
  'BNB SMART CHAIN': bnbProvider,
  TRX: trxProvider,
  TRON: trxProvider,
};

/**
 * Returns the matching blockchain provider instance.
 * @param {string} chainNameOrSymbol
 * @returns {BlockchainProvider}
 */
function getProvider(chainNameOrSymbol = 'ETH') {
  const key = String(chainNameOrSymbol).toUpperCase().trim();
  return providers[key] || ethProvider;
}

/**
 * Automatically identifies blockchain network by address format and patterns.
 * @param {string} address
 * @returns {string} - 'Ethereum' | 'Bitcoin' | 'TRON' | 'BNB Chain' | 'Bank'
 */
function detectChain(address) {
  if (!address || typeof address !== 'string') return 'Ethereum';
  const a = address.trim();
  if (a.startsWith('bc1') || a.startsWith('1') || a.startsWith('3') || a.toUpperCase().includes('BTC')) {
    return 'Bitcoin';
  }
  if (a.startsWith('T') || a.startsWith('T_') || a.toUpperCase().includes('TRON') || a.toUpperCase().includes('TRX')) {
    return 'TRON';
  }
  if (a.startsWith('bnb1') || a.toUpperCase().includes('BNB') || a.toUpperCase().includes('BSC')) {
    return 'BNB Chain';
  }
  if (a.startsWith('HDFC') || a.includes('Bank') || a.toUpperCase().includes('BANK')) {
    return 'Bank';
  }
  return 'Ethereum';
}

/**
 * Validates wallet address against provider schema.
 * @param {string} address
 * @param {string|null} chain
 * @returns {{ valid: boolean, chain: string, provider: string, reason?: string }}
 */
function validateWallet(address, chain = null) {
  if (!address || typeof address !== 'string') {
    return { valid: false, reason: 'Empty address' };
  }
  const detected = chain || detectChain(address);
  const provider = getProvider(detected);
  const valid = provider.validateAddress(address);
  return { valid, chain: detected, provider: provider.name };
}

/**
 * Fetches real-time on-chain transactions for an address using the appropriate provider.
 * @param {string} address
 * @param {string|null} chain
 * @param {object} options
 * @returns {Promise<Array<object>>}
 */
async function fetchOnChainTransactions(address, chain = null, options = {}) {
  const detected = chain || detectChain(address);
  const provider = getProvider(detected);
  return await provider.getTransactions(address, options);
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
  fetchOnChainTransactions,
  providers,
};
