'use strict';

/**
 * errorHandler.js
 * Central Express error handling middleware.
 */

function errorHandler(err, req, res, next) {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${message}`);
    if (status >= 500) console.error(err.stack);
  }

  return res.status(status).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
}

/**
 * 404 handler — mount AFTER all routes.
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.path} not found.` },
  });
}

module.exports = { errorHandler, notFoundHandler };
