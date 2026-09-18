'use strict';

/**
 * predictionEngine.js
 * AI-Assisted Next-Hop Predictive Engine.
 * Clearly separates OBSERVED facts from ANALYTICAL PROBABILISTIC ESTIMATES.
 */

const { getDb } = require('../db/database');

/**
 * Generates analytical estimates for likely next fund destinations.
 */
function generatePredictions(caseId = 'CS-2026-001') {
  const db = getDb();
  const stored = db.prepare('SELECT * FROM predictions WHERE case_id = ?').all(caseId);

  if (stored && stored.length > 0) {
    return stored.map(p => ({
      id: p.id,
      dest: p.dest,
      conf: p.conf,
      reason: p.reason,
      basis: p.basis,
      label: p.label || 'PREDICTED',
      sources: JSON.parse(p.sources || '[]'),
      generatedAt: p.created_at,
    }));
  }

  // Default probabilistic estimates for flagship investigation
  return [
    {
      id: 1,
      dest: 'Exchange X',
      conf: 78,
      reason: 'Similar historical fund-flow patterns from wallets 0x12AB...A8C and 0x44EF...72B indicate a higher probability of remaining funds being consolidated at Exchange X. This prediction is based on observed transaction patterns only.',
      basis: 'Pattern similarity to prior investigated cases with multi-hop layering',
      label: 'PREDICTED',
      sources: [
        'TX-CS-005 (Exchange X deposit observed)',
        'TX-CS-008 (Exchange X deposit observed)',
        'Historical topology similarity model'
      ],
      generatedAt: '22 Aug 2026, 11:18 IST'
    },
    {
      id: 2,
      dest: 'Exchange Z',
      conf: 31,
      reason: 'Minor probability based on cross-case exchange preference patterns. Low confidence — requires additional signal before action.',
      basis: 'Historical cross-case analysis',
      label: 'PREDICTED',
      sources: ['Low-confidence pattern signal'],
      generatedAt: '22 Aug 2026, 11:18 IST'
    }
  ];
}

module.exports = {
  generatePredictions,
};
