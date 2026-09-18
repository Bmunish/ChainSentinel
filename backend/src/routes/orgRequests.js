'use strict';

/**
 * orgRequests.js
 * Unified Organization Intelligence Request Routes.
 */

const express = require('express');
const router = express.Router();
const { createOrganizationRequest, fulfillOrganizationRequest } = require('../services/orgRequestService');
const { applyOrganizationResponseUpdates } = require('../services/recordUpdateService');
const { getDb } = require('../db/database');

// ── GET /api/v1/organization-requests ─────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const caseId = req.query.case_id;
    let query = 'SELECT * FROM organization_requests';
    const params = [];

    if (caseId) {
      query += ' WHERE case_id = ?';
      params.push(caseId);
    }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params);
    const data = rows.map(r => ({
      ...r,
      requested_fields: typeof r.requested_fields === 'string' ? JSON.parse(r.requested_fields || '[]') : r.requested_fields,
      response_data: typeof r.response_data === 'string' ? JSON.parse(r.response_data || '{}') : r.response_data,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/organization-requests/:id ─────────────────────────────────────
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const r = db.prepare('SELECT * FROM organization_requests WHERE id = ?').get(req.params.id);
    if (!r) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    return res.json({
      success: true,
      data: {
        ...r,
        requested_fields: typeof r.requested_fields === 'string' ? JSON.parse(r.requested_fields || '[]') : r.requested_fields,
        response_data: typeof r.response_data === 'string' ? JSON.parse(r.response_data || '{}') : r.response_data,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/organization-requests ────────────────────────────────────────
router.post('/', (req, res, next) => {
  try {
    const result = createOrganizationRequest(req.body || {});
    return res.status(201).json({
      success: true,
      data: result,
      message: 'Organization intelligence request registered.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/organization-requests/:id/submit ─────────────────────────────
router.post('/:id/submit', async (req, res, next) => {
  try {
    const fulfillment = await fulfillOrganizationRequest(req.params.id);
    const autoUpdate = applyOrganizationResponseUpdates(req.params.id);

    return res.json({
      success: true,
      data: {
        ...fulfillment,
        autoUpdateSummary: autoUpdate,
      },
      message: `Response received from ${fulfillment.organization_name} and investigation records auto-synchronized.`,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/organization-requests/:id/response ───────────────────────────
router.post('/:id/response', (req, res, next) => {
  try {
    const autoUpdate = applyOrganizationResponseUpdates(req.params.id);
    return res.json({
      success: true,
      data: autoUpdate,
      message: 'Investigation records updated from organization response.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
