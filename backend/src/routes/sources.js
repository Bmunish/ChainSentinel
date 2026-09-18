'use strict';

/**
 * sources.js — /api/sources routes
 */

const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const sources = db.prepare('SELECT * FROM data_sources ORDER BY id ASC').all();
    return res.json({ success: true, data: sources });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/toggle', (req, res, next) => {
  try {
    const db = getDb();
    const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.id);
    if (!source) return res.status(404).json({ error: 'Source not found.' });

    const newActive = source.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE data_sources SET is_active = ?, last_sync = datetime(\'now\') WHERE id = ?').run(newActive, req.params.id);

    logAudit('CP-FCI-042', `Toggled data source ${source.name} to ${newActive === 1 ? 'Active' : 'Inactive'}`, 'Source', source.name, 'Success');

    return res.json({ success: true, isActive: newActive === 1 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
