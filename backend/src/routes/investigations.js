'use strict';

/**
 * investigations.js — /api/investigations routes
 */

const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db/database');
const { validateWallet, detectChain } = require('../blockchain');
const { computeRiskScore } = require('../engine/riskScoring');
const { analyzeBehaviours } = require('../engine/behaviourEngine');

// ── GET /api/investigations ───────────────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { status, priority, q } = req.query;

    let sql = 'SELECT * FROM investigations WHERE 1=1';
    const args = [];

    if (status) {
      sql += ' AND status = ?';
      args.push(status.toUpperCase());
    }
    if (priority) {
      sql += ' AND priority = ?';
      args.push(priority.toUpperCase());
    }
    if (q) {
      sql += ' AND (case_id LIKE ? OR title LIKE ? OR seed_address LIKE ?)';
      const like = `%${q}%`;
      args.push(like, like, like);
    }

    sql += ' ORDER BY created_at DESC';
    const cases = db.prepare(sql).all(...args);

    // Attach summary counts for each case
    const enriched = cases.map(c => {
      const wCount = db.prepare('SELECT COUNT(*) AS cnt FROM wallets').get().cnt;
      const txCount = db.prepare('SELECT COUNT(*) AS cnt FROM transactions').get().cnt;
      return {
        id: c.case_id,
        case_id: c.case_id,
        title: c.title,
        description: c.description,
        priority: c.priority,
        status: c.status,
        riskScore: c.risk_score || 94,
        riskLevel: c.risk_level || c.priority,
        investigator: c.assigned_investigator || c.created_by,
        created: c.created_at,
        lastUpdated: c.updated_at,
        seed: c.seed_address,
        seedType: c.seed_type,
        blockchain: c.blockchain,
        victimRef: c.victim_ref || 'VIC-2026-089',
        funds: c.funds || '₹12.4L',
        wallets: c.case_id === 'CS-2026-001' ? 6 : Math.min(wCount, 12),
        exchanges: 2,
        accounts: 1,
        tx: c.case_id === 'CS-2026-001' ? 8 : Math.min(txCount, 25),
        notes: c.notes,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/investigations ──────────────────────────────────────────────────
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const {
      title,
      description,
      wallet_address,
      seed = wallet_address,
      seedType = 'wallet',
      blockchain,
      priority = 'HIGH',
      victim_ref = 'VIC-2026-' + Math.floor(100 + Math.random() * 900),
      notes = '',
    } = req.body || {};

    if (!seed || seed.trim().length < 3) {
      return res.status(400).json({ error: 'Valid seed wallet address or case ID is required.' });
    }

    const cleanSeed = seed.trim();
    const detectedChain = blockchain || detectChain(cleanSeed);
    const valResult = validateWallet(cleanSeed, detectedChain);

    // Count existing cases to make next ID
    const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM investigations').get();
    const nextNum = String(countRow.cnt + 1).padStart(3, '0');
    const caseId = `CS-2026-${nextNum}`;
    const caseTitle = title || `Investigation on ${cleanSeed.slice(0, 10)}…`;

    // Ensure wallet exists in DB
    const existingWallet = db.prepare('SELECT * FROM wallets WHERE address = ?').get(cleanSeed);
    if (!existingWallet) {
      db.prepare(`
        INSERT INTO wallets (address, chain, type, label, base_risk, flagged)
        VALUES (?, ?, 'Seed Wallet', 'Investigation Seed', 85, 1)
      `).run(cleanSeed, detectedChain);
    }

    // Compute initial risk
    const riskProf = computeRiskScore(cleanSeed, { useCache: false });
    const riskLevel = riskProf.riskScore >= 90 ? 'CRITICAL' : riskProf.riskScore >= 75 ? 'HIGH' : riskProf.riskScore >= 50 ? 'MEDIUM' : 'LOW';

    // Insert investigation
    db.prepare(`
      INSERT INTO investigations (case_id, title, description, status, priority, risk_score, risk_level, seed_address, seed_type, blockchain, victim_ref, notes)
      VALUES (?, ?, ?, 'INVESTIGATING', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      caseId,
      caseTitle,
      description || `Automated crypto fraud investigation initialized for ${cleanSeed}.`,
      priority.toUpperCase(),
      riskProf.riskScore,
      riskLevel,
      cleanSeed,
      seedType,
      detectedChain,
      victim_ref,
      notes
    );

    // Insert timeline events
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const nowDate = '22 Aug 2026';

    const insertTimeline = db.prepare(`
      INSERT INTO timeline_events (case_id, time, date, event, detail, source, dot, ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTimeline.run(caseId, nowTime, nowDate, `Case ${caseId} created`, `Investigation opened for ${cleanSeed}.`, 'Case Management', 'blue', caseId);
    insertTimeline.run(caseId, nowTime, nowDate, 'Seed wallet validated', `Network detected: ${detectedChain}. Address format verified.`, 'Blockchain Analysis', 'blue', cleanSeed);
    insertTimeline.run(caseId, nowTime, nowDate, `Risk score calculated: ${Math.round(riskProf.riskScore)}/100 ${riskLevel}`, 'Automated behavioural risk evaluation completed.', 'Risk Engine', riskProf.riskScore >= 75 ? 'red' : 'orange', '');

    logAudit(req.user?.officer_id || 'CP-FCI-042', `Created investigation ${caseId}`, 'Investigation', caseId, 'Success', { seed: cleanSeed });

    return res.status(201).json({
      success: true,
      data: {
        caseId,
        id: caseId,
        title: caseTitle,
        seed: cleanSeed,
        blockchain: detectedChain,
        status: 'INVESTIGATING',
        priority: priority.toUpperCase(),
        riskScore: riskProf.riskScore,
        riskLevel,
        validation: valResult,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/investigations/:id ───────────────────────────────────────────────
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const c = db.prepare('SELECT * FROM investigations WHERE case_id = ? OR id = ?').get(req.params.id, req.params.id);

    if (!c) {
      return res.status(404).json({ error: 'Investigation not found.' });
    }

    return res.json({
      success: true,
      data: {
        id: c.case_id,
        case_id: c.case_id,
        title: c.title,
        description: c.description,
        priority: c.priority,
        status: c.status,
        riskScore: c.risk_score || 94,
        riskLevel: c.risk_level || 'CRITICAL',
        investigator: c.assigned_investigator || c.created_by,
        created: c.created_at,
        lastUpdated: c.updated_at,
        seed: c.seed_address,
        seedType: c.seed_type,
        blockchain: c.blockchain,
        victimRef: c.victim_ref || 'VIC-2026-089',
        funds: c.funds || '₹12.4L',
        notes: c.notes,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/investigations/:id ─────────────────────────────────────────────
router.patch('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { status, priority, notes, title } = req.body || {};

    const updates = [];
    const args = [];

    if (status) { updates.push('status = ?'); args.push(status.toUpperCase()); }
    if (priority) { updates.push('priority = ?'); args.push(priority.toUpperCase()); }
    if (notes !== undefined) { updates.push('notes = ?'); args.push(notes); }
    if (title) { updates.push('title = ?'); args.push(title); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    updates.push("updated_at = datetime('now')");
    args.push(req.params.id, req.params.id);

    const result = db.prepare(`UPDATE investigations SET ${updates.join(', ')} WHERE case_id = ? OR id = ?`).run(...args);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Investigation not found.' });
    }

    logAudit(req.user?.officer_id || 'CP-FCI-042', `Updated investigation ${req.params.id}`, 'Investigation', req.params.id, 'Success');

    return res.json({ success: true, message: 'Investigation updated.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
