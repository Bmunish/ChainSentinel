'use strict';

/**
 * requests.js — /api/requests routes (Lawful Data Requests Lifecycle)
 */

const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db/database');

// ── GET /api/requests ─────────────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const caseId = req.query.case_id || 'CS-2026-001';
    const reqs = db.prepare('SELECT * FROM requests WHERE case_id = ? ORDER BY id ASC').all(caseId);

    const formatted = reqs.map(r => ({
      id: r.id,
      org: r.org,
      info: r.info,
      case: r.case_id,
      legal: r.legal,
      priority: r.priority,
      status: r.status,
      created: r.created_at,
      by: r.created_by,
      notes: r.notes || '',
    }));

    return res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/requests ────────────────────────────────────────────────────────
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const {
      org,
      info,
      caseId = 'CS-2026-001',
      legal = 'Section 91 CrPC — Production of documents',
      priority = 'HIGH',
      notes = '',
      createdBy = 'CP-FCI-042',
    } = req.body || {};

    if (!org || !info) {
      return res.status(400).json({ error: 'Organization and requested information are required.' });
    }

    const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM requests').get();
    const id = `REQ-CS-00${countRow.cnt + 1}`;
    const nowStr = '22 Aug 2026, ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    db.prepare(`
      INSERT INTO requests (id, case_id, org, info, legal, priority, status, created_by, created_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `).run(id, caseId, org, info, legal, priority.toUpperCase(), createdBy, nowStr, notes);

    // Timeline event
    db.prepare(`
      INSERT INTO timeline_events (case_id, time, date, event, detail, source, dot, ref)
      VALUES (?, ?, ?, ?, ?, 'Investigator Requests', 'blue', ?)
    `).run(
      caseId,
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      '22 Aug 2026',
      `Data request ${id} created`,
      `Request to ${org} — ${info.slice(0, 60)}`,
      id
    );

    logAudit(createdBy, `Created lawful data request ${id}`, 'Request', id, 'Success', { org });

    return res.status(201).json({
      success: true,
      data: {
        id,
        org,
        info,
        case: caseId,
        legal,
        priority: priority.toUpperCase(),
        status: 'PENDING',
        created: nowStr,
        by: createdBy,
        notes,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/requests/:id/status ────────────────────────────────────────────
router.patch('/:id/status', (req, res, next) => {
  try {
    const db = getDb();
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const result = db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(status.toUpperCase(), req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Request not found.' });

    const reqRecord = db.prepare('SELECT case_id FROM requests WHERE id = ?').get(req.params.id);

    // Add update to timeline
    db.prepare(`
      INSERT INTO timeline_events (case_id, time, date, event, detail, source, dot, ref)
      VALUES (?, ?, ?, ?, ?, 'Investigator Requests', 'blue', ?)
    `).run(
      reqRecord ? reqRecord.case_id : 'CS-2026-001',
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      '22 Aug 2026',
      `Request ${req.params.id} status: ${status}`,
      `Status updated to ${status}`,
      req.params.id
    );

    logAudit(req.user?.officer_id || 'CP-FCI-042', `Updated request ${req.params.id} to ${status}`, 'Request', req.params.id, 'Success');

    return res.json({ success: true, message: `Request status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
