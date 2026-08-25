'use strict';

/**
 * server.js — ChainSentinel Backend Entry Point
 */

require('dotenv').config();
const app = require('./src/app');

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   ChainSentinel — Financial Intelligence API              ║');
  console.log('║   Chandigarh Police • Financial Cyber Intelligence Div.   ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║   Server  : http://localhost:${PORT}                         ║`);
  console.log(`║   Env     : ${(process.env.NODE_ENV || 'development').padEnd(46)} ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║   Endpoints:                                              ║');
  console.log('║   GET  /health                                            ║');
  console.log('║   GET  /api/trace/:seed?hops=3&direction=both             ║');
  console.log('║   GET  /api/wallets                                       ║');
  console.log('║   GET  /api/wallets/:address/risk                         ║');
  console.log('║   GET  /api/wallets/:address/transactions                 ║');
  console.log('║   GET  /api/transactions                                  ║');
  console.log('║   GET  /api/transactions/stats/overview                   ║');
  console.log('║   POST /api/seed  (dev only)                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[Server] ${signal} received — shutting down gracefully…`);
  server.close(() => {
    const { closeDb } = require('./src/db/database');
    closeDb();
    console.log('[Server] Closed. Goodbye.');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown stalls
  setTimeout(() => {
    console.error('[Server] Forced exit after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});
