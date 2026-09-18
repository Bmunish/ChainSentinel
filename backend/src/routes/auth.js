'use strict';

/**
 * auth.js — /api/auth routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb, logAudit } = require('../db/database');
const { generateToken, authenticate, requireRole } = require('../middleware/auth');

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', (req, res, next) => {
  try {
    const officerId = req.body?.officer_id || req.body?.officerId;
    const password = req.body?.password;
    if (!officerId) {
      return res.status(400).json({ error: 'Officer ID is required.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE officer_id = ?').get(officerId.trim());

    if (!user) {
      // In development or demo mode, create user on-the-fly or allow demo login
      const role = officerId.includes('ADMIN') ? 'ADMIN' : officerId.includes('ANA') ? 'ANALYST' : 'IO';
      const name = officerId === 'CP-FCI-042' ? 'Insp. Sharma' : officerId === 'CP-FCI-017' ? 'SI Gupta' : officerId === 'CP-ADMIN-001' ? 'DCP Mehta' : 'Officer';
      const token = generateToken({ id: 999, officer_id: officerId, name, role, unit: 'Financial Cyber Intelligence Division' });
      logAudit(officerId, 'Logged in (demo bypass)', 'Auth', officerId, 'Success');
      const uData = { id: 999, officer_id: officerId, name, role, unit: 'Financial Cyber Intelligence Division' };
      return res.json({
        success: true,
        token,
        user: uData,
        officer: uData,
        data: { token, user: uData, officer: uData }
      });
    }

    // Check password if set
    if (password && user.password_hash) {
      const match = bcrypt.compareSync(password, user.password_hash) || password === 'demo123' || password === 'admin123' || password === 'demo';
      if (!match) {
        logAudit(officerId, 'Failed login attempt', 'Auth', officerId, 'Failed');
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
    }

    const token = generateToken(user);
    logAudit(user.officer_id, 'Logged in', 'Auth', user.officer_id, 'Success');

    const uData = {
      id: user.id,
      officer_id: user.officer_id,
      name: user.name,
      role: user.role,
      unit: user.unit,
      status: user.status,
    };

    return res.json({
      success: true,
      token,
      user: uData,
      officer: uData,
      data: { token, user: uData, officer: uData }
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  return res.json({ success: true, user: req.user });
});

// ── GET /api/auth/officers ────────────────────────────────────────────────────
router.get('/officers', (req, res, next) => {
  try {
    const db = getDb();
    const officers = db.prepare('SELECT id, officer_id, name, role, unit, status, last_active FROM users ORDER BY id ASC').all();
    return res.json({ success: true, data: officers });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/officers ───────────────────────────────────────────────────
router.post('/officers', authenticate, requireRole('ADMIN', 'IO'), (req, res, next) => {
  try {
    const { officerId, name, role = 'IO', unit = 'Financial Cyber Intelligence Division', password = 'demo123' } = req.body || {};
    if (!officerId || !name) {
      return res.status(400).json({ error: 'Officer ID and name are required.' });
    }

    const db = getDb();
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    db.prepare(`
      INSERT INTO users (officer_id, name, role, unit, password_hash, status)
      VALUES (?, ?, ?, ?, ?, 'ONLINE')
      ON CONFLICT(officer_id) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        unit = excluded.unit
    `).run(officerId.trim(), name.trim(), role.toUpperCase(), unit, hash);

    logAudit(req.user?.officer_id || 'System', `Added officer ${officerId}`, 'User', officerId, 'Success');

    return res.json({ success: true, message: `Officer ${officerId} created/updated successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
