'use strict';

/**
 * ocr.js
 * Express routes for OCR Evidence Ingestion & Human-in-the-Loop Field Review.
 */

const express = require('express');
const router = express.Router();
const { processDocumentOCR, updateExtractionField } = require('../services/ocrService');
const { getDb } = require('../db/database');

// ── POST /api/v1/evidence/ocr ─────────────────────────────────────────────────
router.post('/ocr', (req, res, next) => {
  try {
    const { text, document_name, case_id } = req.body || {};
    const sampleText = text || `
      TRANSACTION RECEIPT
      Date: 22 Aug 2026, 09:41 AM IST
      Status: SUCCESSFUL
      Sender Account: 501002849182 (HDFC Bank)
      Beneficiary UPI: cyber-scam-ops@okhdfcbank
      Crypto Exchange: Exchange X
      Recipient Wallet: 0x7A3F1C2E4B6D8F0A123456789ABCDEF012345678
      Transaction Hash: 0x12ab8f229c1d2e3f4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123
      Amount Transferred: ₹12,40,000.00 INR (14.85 ETH)
      Network: Ethereum Mainnet
      Reference Number: VIC-2026-089-REF
    `;

    const result = processDocumentOCR(sampleText, document_name || 'Victim_Receipt_Screenshot.png', case_id || 'CS-2026-001');

    return res.status(201).json({
      success: true,
      data: result,
      message: 'OCR processed successfully. Review extracted fields before confirming.',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/evidence/:id/extractions ──────────────────────────────────────
router.get('/:id/extractions', (req, res, next) => {
  try {
    const db = getDb();
    const rec = db.prepare('SELECT * FROM ocr_extractions WHERE id = ?').get(req.params.id);
    if (!rec) {
      return res.status(404).json({ success: false, error: 'Extraction not found' });
    }

    return res.json({
      success: true,
      data: {
        id: rec.id,
        caseId: rec.case_id,
        documentName: rec.document_name,
        documentType: rec.document_type,
        rawText: rec.raw_text,
        extractedFields: JSON.parse(rec.extracted_fields || '[]'),
        status: rec.status,
        createdAt: rec.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/evidence/:id/confirm ─────────────────────────────────────────
router.post('/:id/confirm', (req, res, next) => {
  try {
    const { field_id, action, edited_value } = req.body || {};
    if (!field_id || !action) {
      return res.status(400).json({ success: false, error: 'field_id and action (CONFIRM|EDIT|REJECT) are required' });
    }

    const result = updateExtractionField(req.params.id, field_id, action, edited_value);

    return res.json({
      success: true,
      data: result,
      message: `Field ${action.toLowerCase()}ed successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
