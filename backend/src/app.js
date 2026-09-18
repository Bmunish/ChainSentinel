'use strict';

/**
 * app.js
 * Express application bootstrap — routes, middleware, CORS, and health.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRouter = require('./routes/auth');
const investigationsRouter = require('./routes/investigations');
const traceRouter = require('./routes/trace');
const walletsRouter = require('./routes/wallets');
const transactionsRouter = require('./routes/transactions');
const alertsRouter = require('./routes/alerts');
const behaviourRouter = require('./routes/behaviour');
const predictionsRouter = require('./routes/predictions');
const evidenceRouter = require('./routes/evidence');
const requestsRouter = require('./routes/requests');
const timelineRouter = require('./routes/timeline');
const reportsRouter = require('./routes/reports');
const sourcesRouter = require('./routes/sources');
const entitiesRouter = require('./routes/entities');
const vaspsRouter = require('./routes/vasps');
const riskRouter = require('./routes/risk');
const { crossborderRouter, osintRouter, auditRouter, dashboardRouter } = require('./routes/dashboard');

const ocrRouter = require('./routes/ocr');
const orgRequestsRouter = require('./routes/orgRequests');
const aiRouter = require('./routes/ai');
const graphEventsRouter = require('./routes/graphEvents');

const { resetDb } = require('./db/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Serve the existing frontend so the prototype runs from one local URL.
const frontendRoot = path.join(__dirname, '..', '..');
app.use(express.static(frontendRoot));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Officer-ID'],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP request logging ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health & Readiness checks ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ChainTrace Financial Intelligence API',
    version: '1.0.0',
    mode: process.env.DEMO_MODE === 'false' ? 'LIVE' : 'HYBRID_DEMO',
    ts: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    database: 'connected',
    providers: ['Ethereum', 'Bitcoin', 'BNB Chain', 'TRON'],
    ts: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'index.html'));
});

// ── API Routes (v1 & legacy aliases) ──────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/investigations', investigationsRouter);
app.use('/api/trace', traceRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/behaviour', behaviourRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/vasps', vaspsRouter);
app.use('/api/risk', riskRouter);
app.use('/api/crossborder', crossborderRouter);
app.use('/api/osint', osintRouter);
app.use('/api/audit', auditRouter);
app.use('/api/dashboard', dashboardRouter);

// New v1 Enterprise Intelligence Endpoints
app.use('/api/v1/evidence', ocrRouter);
app.use('/api/ocr', ocrRouter);
app.use('/api/v1/organization-requests', orgRequestsRouter);
app.use('/api/organization-requests', orgRequestsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/ai', aiRouter);
app.use('/api/v1', aiRouter);
app.use('/api/v1/graph', graphEventsRouter);

// ── Dev-only: re-seed endpoint ────────────────────────────────────────────────
app.post('/api/seed', async (req, res, next) => {
  try {
    resetDb();
    delete require.cache[require.resolve('./db/seed')];
    const { seed } = require('./db/seed');
    seed();
    res.json({ success: true, message: 'Database re-seeded with mock fraud cluster data.' });
  } catch (err) {
    next(err);
  }
});

// ── 404 + Error handlers ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
