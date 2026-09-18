'use strict';

/**
 * evidence.js — /api/evidence routes
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb, logAudit } = require('../db/database');

// ── GET /api/evidence ─────────────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const caseId = req.query.case_id || 'CS-2026-001';
    const items = db.prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY id ASC').all(caseId);

    const formatted = items.map(e => ({
      id: e.id,
      type: e.type,
      source: e.source,
      case: e.case_id,
      entity: e.entity,
      txRef: e.tx_ref || '—',
      collectedAt: e.collected_at,
      collectedBy: e.collected_by,
      hash: e.hash,
      status: e.status,
      notes: e.notes || '',
    }));

    return res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/evidence ────────────────────────────────────────────────────────
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const {
      type,
      source,
      entity = '—',
      txRef = '—',
      caseId = 'CS-2026-001',
      notes = '',
      collectedBy = 'CP-FCI-042',
    } = req.body || {};

    if (!type || !source) {
      return res.status(400).json({ error: 'Evidence type and source are required.' });
    }

    const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM evidence').get();
    const id = `EV-CS-0${String(countRow.cnt + 1).padStart(2, '0')}`;
    const nowStr = '22 Aug 2026, ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const rawData = `${id}-${type}-${source}-${entity}-${Date.now()}`;
    const hash = crypto.createHash('sha256').update(rawData).digest('hex').slice(0, 16);

    db.prepare(`
      INSERT INTO evidence (id, case_id, type, source, entity, tx_ref, collected_at, collected_by, hash, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Collected', ?)
    `).run(id, caseId, type, source, entity, txRef, nowStr, collectedBy, hash, notes);

    // Add event to timeline
    db.prepare(`
      INSERT INTO timeline_events (case_id, time, date, event, detail, source, dot, ref)
      VALUES (?, ?, ?, ?, ?, 'Evidence Vault', 'blue', ?)
    `).run(
      caseId,
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      '22 Aug 2026',
      `Evidence ${id} added`,
      `${type} from ${source}`,
      id
    );

    logAudit(collectedBy, `Added evidence ${id}`, 'Evidence', id, 'Success');

    return res.status(201).json({
      success: true,
      data: {
        id,
        type,
        source,
        case: caseId,
        entity,
        txRef,
        collectedAt: nowStr,
        collectedBy,
        hash,
        status: 'Collected',
        notes,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/evidence/:id/verify ─────────────────────────────────────────────
router.post('/:id/verify', (req, res, next) => {
  try {
    const db = getDb();
    const result = db.prepare("UPDATE evidence SET status = 'Verified' WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Evidence not found.' });

    logAudit(req.user?.officer_id || 'CP-FCI-042', `Verified evidence integrity for ${req.params.id}`, 'Evidence', req.params.id, 'Success');

    return res.json({ success: true, message: `Integrity verified for ${req.params.id}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
