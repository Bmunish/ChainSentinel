'use strict';

/**
 * app.js
 * Express application bootstrap — routes, middleware, CORS.
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');

const traceRouter       = require('./routes/trace');
const walletsRouter     = require('./routes/wallets');
const transactionsRouter = require('./routes/transactions');
const { resetDb }       = require('./db/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman) or matching allowed origins
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error(`CORS: origin '${origin}' not allowed.`));
  },
  methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:   ['Content-Type', 'Authorization', 'X-Officer-ID'],
  credentials:      true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP request logging ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'ChainSentinel Financial Intelligence API',
    version: '1.0.0',
    ts:      new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/trace',        traceRouter);
app.use('/api/wallets',      walletsRouter);
app.use('/api/transactions', transactionsRouter);

// ── Dev-only: re-seed endpoint ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.post('/api/seed', async (req, res, next) => {
    try {
      resetDb();
      // Dynamically require so the seeder can be hot-reloaded
      delete require.cache[require.resolve('./db/seed')];
      require('./db/seed');
      res.json({ success: true, message: 'Database re-seeded with mock fraud cluster data.' });
    } catch (err) {
      next(err);
    }
  });
}

// ── 404 + Error handlers ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
