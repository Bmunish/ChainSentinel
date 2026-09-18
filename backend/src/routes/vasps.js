'use strict';

/**
 * vasps.js / exchange.js — /api/vasps routes
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res, next) => {
  try {
    const vasps = [
      {
        id: 'exchange-x',
        name: 'Exchange X',
        desc: 'High-risk counterparty identified',
        reqStatus: 'REQ-CS-001 PENDING — CRITICAL',
        clusters: '2 linked clusters',
        jurisdiction: 'UAE (Attributed)',
        riskLevel: 'HIGH',
        category: 'Regulated VASP',
        confidence: 'STRONG',
      },
      {
        id: 'exchange-y',
        name: 'Exchange Y',
        desc: 'Medium-risk counterparty',
        reqStatus: 'REQ-CS-003 SENT — HIGH',
        clusters: '1 linked cluster',
        jurisdiction: 'International',
        riskLevel: 'MEDIUM',
        category: 'Crypto Exchange',
        confidence: 'CONFIRMED',
      },
      {
        id: 'exchange-z',
        name: 'Exchange Z',
        desc: 'Low-risk — no confirmed link',
        reqStatus: 'No request filed',
        clusters: '0 linked clusters',
        jurisdiction: 'Unknown',
        riskLevel: 'LOW',
        category: 'Crypto Exchange',
        confidence: 'POTENTIAL',
      },
    ];
    return res.json({ success: true, data: vasps });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
