'use strict';

/**
 * ocrService.js
 * OCR Evidence Ingestion and Field Extraction Pipeline.
 * Extracts wallet addresses, tx hashes, amounts, timestamps, exchanges, and payment IDs.
 */

const { getDb, logAudit } = require('../db/database');
const { detectChain, isValidAddress } = require('../blockchain');

// ── Extraction Patterns ───────────────────────────────────────────────────────
const ETH_REGEX = /\b(0x[a-fA-F0-9]{40})\b/g;
const BTC_REGEX = /\b((1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,42})\b/g;
const TX_HASH_REGEX = /\b(0x[a-fA-F0-9]{64})\b/g;
const AMOUNT_REGEX = /(?:₹|\$|INR|USD|USDT|ETH|BTC)\s?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?(?:\s?(?:L|Lakh|Cr|Crore|K|M))?)/gi;
const DATE_REGEX = /\b(\d{1,2}[\/\-\.\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[\/\-\.\s]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|IST|UTC))?)?)\b/gi;
const UPI_REGEX = /\b([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})\b/g;
const EXCHANGES = ['Binance', 'WazirX', 'CoinDCX', 'CoinSwitch', 'Exchange X', 'KuCoin', 'OKX', 'Bybit', 'Kraken', 'Bitfinex'];

/**
 * Performs heuristic OCR extraction on text or simulated document image.
 * @param {string} rawText
 * @param {string} documentName
 * @param {string} caseId
 * @returns {object}
 */
function processDocumentOCR(rawText, documentName = 'Evidence_Capture.png', caseId = 'CS-2026-001') {
  const extractedFields = [];
  const text = rawText || '';

  // 1. Detect ETH / EVM Wallets
  const ethMatches = [...text.matchAll(ETH_REGEX)];
  for (const match of ethMatches) {
    const val = match[1];
    extractedFields.push({
      id: `field_${extractedFields.length + 1}`,
      field: 'wallet_address',
      label: 'Wallet Address (EVM)',
      value: val,
      blockchain: 'Ethereum',
      confidence: 0.98,
      status: 'PENDING_REVIEW',
      sourceRegion: 'Primary Address Block',
    });
  }

  // 2. Detect BTC Wallets
  const btcMatches = [...text.matchAll(BTC_REGEX)];
  for (const match of btcMatches) {
    const val = match[1];
    if (!val.startsWith('0x') && isValidAddress(val, 'BTC')) {
      extractedFields.push({
        id: `field_${extractedFields.length + 1}`,
        field: 'wallet_address',
        label: 'Wallet Address (Bitcoin)',
        value: val,
        blockchain: 'Bitcoin',
        confidence: 0.95,
        status: 'PENDING_REVIEW',
        sourceRegion: 'Recipient Address Block',
      });
    }
  }

  // 3. Detect TX Hashes
  const txMatches = [...text.matchAll(TX_HASH_REGEX)];
  for (const match of txMatches) {
    const val = match[1];
    extractedFields.push({
      id: `field_${extractedFields.length + 1}`,
      field: 'transaction_hash',
      label: 'Transaction Hash',
      value: val,
      confidence: 0.99,
      status: 'PENDING_REVIEW',
      sourceRegion: 'TX Reference Block',
    });
  }

  // 4. Detect Amount / Currency
  const amountMatches = [...text.matchAll(AMOUNT_REGEX)];
  if (amountMatches.length > 0) {
    extractedFields.push({
      id: `field_${extractedFields.length + 1}`,
      field: 'amount',
      label: 'Transaction Amount',
      value: amountMatches[0][0].trim(),
      confidence: 0.92,
      status: 'PENDING_REVIEW',
      sourceRegion: 'Amount Field',
    });
  }

  // 5. Detect Date / Time
  const dateMatches = [...text.matchAll(DATE_REGEX)];
  if (dateMatches.length > 0) {
    extractedFields.push({
      id: `field_${extractedFields.length + 1}`,
      field: 'timestamp',
      label: 'Transaction Timestamp',
      value: dateMatches[0][1].trim(),
      confidence: 0.89,
      status: 'PENDING_REVIEW',
      sourceRegion: 'Date/Time Header',
    });
  }

  // 6. Detect Exchange / Organization
  for (const ex of EXCHANGES) {
    if (new RegExp(`\\b${ex}\\b`, 'i').test(text)) {
      extractedFields.push({
        id: `field_${extractedFields.length + 1}`,
        field: 'exchange',
        label: 'Detected Exchange / VASP',
        value: ex,
        confidence: 0.94,
        status: 'PENDING_REVIEW',
        sourceRegion: 'Header / Logo Watermark',
      });
      break;
    }
  }

  // 7. Detect UPI / Payment Reference
  const upiMatches = [...text.matchAll(UPI_REGEX)];
  for (const match of upiMatches) {
    extractedFields.push({
      id: `field_${extractedFields.length + 1}`,
      field: 'payment_ref',
      label: 'UPI / Payment Identifier',
      value: match[1],
      confidence: 0.91,
      status: 'PENDING_REVIEW',
      sourceRegion: 'Payment Details Block',
    });
  }

  const extractionId = `OCR-EV-${Date.now().toString().slice(-6)}`;
  const db = getDb();

  db.prepare(`
    INSERT INTO ocr_extractions (id, case_id, document_name, document_type, raw_text, extracted_fields, status, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    extractionId,
    caseId,
    documentName,
    documentName.endsWith('.pdf') ? 'PDF' : 'SCREENSHOT',
    text,
    JSON.stringify(extractedFields),
    'PENDING_REVIEW',
    'CP-FCI-042'
  );

  logAudit('CP-FCI-042', `Processed OCR on ${documentName}`, 'OCR_Ingestion', extractionId, 'Success', {
    extractedFieldsCount: extractedFields.length,
  });

  return {
    id: extractionId,
    caseId,
    documentName,
    rawText: text,
    extractedFields,
    status: 'PENDING_REVIEW',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Confirms or updates an extracted OCR field.
 * @param {string} extractionId
 * @param {string} fieldId
 * @param {'CONFIRM'|'EDIT'|'REJECT'} action
 * @param {string} [editedValue]
 * @returns {object}
 */
function updateExtractionField(extractionId, fieldId, action, editedValue = null) {
  const db = getDb();
  const rec = db.prepare('SELECT * FROM ocr_extractions WHERE id = ?').get(extractionId);
  if (!rec) throw new Error(`OCR Extraction ${extractionId} not found`);

  const fields = JSON.parse(rec.extracted_fields || '[]');
  const target = fields.find(f => f.id === fieldId);
  if (!target) throw new Error(`Field ${fieldId} not found in extraction ${extractionId}`);

  if (action === 'CONFIRM') {
    target.status = 'CONFIRMED';
  } else if (action === 'REJECT') {
    target.status = 'REJECTED';
  } else if (action === 'EDIT' && editedValue) {
    target.value = editedValue;
    target.status = 'CONFIRMED';
    target.confidence = 1.0; // Manual human-in-the-loop verification
  }

  // Update in DB
  db.prepare('UPDATE ocr_extractions SET extracted_fields = ? WHERE id = ?')
    .run(JSON.stringify(fields), extractionId);

  logAudit('CP-FCI-042', `Updated OCR field ${target.field} to ${target.status}`, 'OCR_Review', extractionId, 'Success', {
    field: target.field,
    value: target.value,
    action,
  });

  return {
    extractionId,
    field: target,
    allFields: fields,
  };
}

module.exports = {
  processDocumentOCR,
  updateExtractionField,
};
