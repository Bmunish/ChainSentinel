'use strict';

/**
 * BlockchainProvider.js
 * Abstract interface for blockchain data providers.
 * Allows seamless switching between Live RPC / Explorers and Deterministic Demo mode.
 */

class BlockchainProvider {
  constructor(name, chainSymbol) {
    if (new.target === BlockchainProvider) {
      throw new TypeError('Cannot construct BlockchainProvider instances directly.');
    }
    this.name = name;
    this.chainSymbol = chainSymbol;
  }

  /**
   * Validates if the given address matches the blockchain format.
   * @param {string} address
   * @returns {boolean}
   */
  validateAddress(address) {
    throw new Error('Method validateAddress() must be implemented.');
  }

  /**
   * Fetches current balance for the given address.
   * @param {string} address
   * @returns {Promise<{ balance: string, balanceUsd: number }>}
   */
  async getBalance(address) {
    throw new Error('Method getBalance() must be implemented.');
  }

  /**
   * Retrieves transaction history for the given address.
   * @param {string} address
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async getTransactions(address, options = {}) {
    throw new Error('Method getTransactions() must be implemented.');
  }

  /**
   * Checks health / connectivity to the blockchain endpoint.
   * @returns {Promise<{ healthy: boolean, latencyMs: number, message?: string }>}
   */
  async checkHealth() {
    return { healthy: true, latencyMs: 15, message: 'Provider operational' };
  }
}

module.exports = BlockchainProvider;
