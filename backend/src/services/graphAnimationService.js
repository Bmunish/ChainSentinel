'use strict';

/**
 * graphAnimationService.js
 * Generates incremental discovery sequences and animation events for live financial graph playback.
 */

const { getDb } = require('../db/database');

/**
 * Generates timed animation event steps for a given case or seed.
 * @param {string} caseId
 * @param {string} seedAddress
 * @returns {object[]}
 */
function getGraphDiscoveryEvents(caseId = 'CS-2026-001', seedAddress = '0x7A3F...B91F') {
  return [
    {
      step: 1,
      type: 'SEED_INGESTION',
      nodeId: seedAddress,
      title: '1. Suspect Seed Ingested',
      description: `Primary reported wallet ${seedAddress.slice(0, 10)}... loaded with ₹12.4L initial volume.`,
      highlightNodes: [seedAddress],
      highlightEdges: [],
      delayMs: 0,
    },
    {
      step: 2,
      type: 'FAN_OUT_DISCOVERY',
      nodeId: '0x12AB...A8C',
      title: '2. High-Velocity Fan-Out Outflows',
      description: 'Transaction edges animate outward to 3 distinct intermediary addresses within a 4-minute window.',
      highlightNodes: [seedAddress, '0x12AB...A8C', '0x44EF...72B', '0x99BC...31D'],
      highlightEdges: ['e1', 'e2', 'e3'],
      delayMs: 1200,
    },
    {
      step: 3,
      type: 'INTERMEDIARY_LAYERING',
      nodeId: '0x66CD...33A',
      title: '3. Multi-Hop Layering & Consolidation',
      description: 'Secondary intermediary wallets execute split-and-merge cycles to obfuscate audit trail.',
      highlightNodes: ['0x66CD...33A', '0x88EE...99F'],
      highlightEdges: ['e4', 'e5', 'e6'],
      delayMs: 2400,
    },
    {
      step: 4,
      type: 'VASP_CONVERGENCE',
      nodeId: 'exchange-x',
      title: '4. Regulated VASP Endpoint Discovered',
      description: 'Funds converge at Exchange X deposit address. Immediate freeze & KYC production candidate identified.',
      highlightNodes: ['exchange-x', 'hdfc-bank'],
      highlightEdges: ['e7', 'e8'],
      delayMs: 3600,
    },
    {
      step: 5,
      type: 'INTELLIGENCE_LOCKED',
      title: '5. Full Graph Topology Analyzed',
      description: 'Complete 3-hop topology mapped with 94/100 explainable risk score and 5 active behavioural alerts.',
      highlightNodes: [seedAddress, 'exchange-x'],
      highlightEdges: ['e1', 'e4', 'e7'],
      delayMs: 4800,
    },
  ];
}

module.exports = {
  getGraphDiscoveryEvents,
};
