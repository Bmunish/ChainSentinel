'use strict';

/**
 * auth.js
 * JWT Authentication & Role-Based Access Control (RBAC) Middleware.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chainsentinel-super-secret-jwt-key-sih-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generates a signed JWT for an officer/user.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      officer_id: user.officer_id,
      name: user.name,
      role: user.role,
      unit: user.unit,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Authenticates request using Authorization header (Bearer <token>) or X-Officer-ID fallback.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const officerIdHeader = req.headers['x-officer-id'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
  }

  // Graceful fallback for prototype if X-Officer-ID is provided
  if (officerIdHeader) {
    req.user = {
      officer_id: officerIdHeader,
      role: officerIdHeader.includes('ADMIN') ? 'ADMIN' : officerIdHeader.includes('ANA') ? 'ANALYST' : 'IO',
      name: 'Authenticated Officer',
    };
    return next();
  }

  // Default guest/dev fallback if running in dev/demo mode
  if (process.env.NODE_ENV !== 'production') {
    req.user = {
      officer_id: 'CP-FCI-042',
      role: 'IO',
      name: 'Insp. Sharma',
    };
    return next();
  }

  return res.status(401).json({ error: 'Authentication required. Please log in.' });
}

/**
 * Role-Based Access Control middleware.
 * @param  {...string} allowedRoles (e.g. 'ADMIN', 'IO', 'ANALYST', 'VIEWER')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

    // ADMIN always has full access
    if (userRole === 'ADMIN' || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Access forbidden: Role '${req.user.role}' lacks permission for this operation.`,
      requiredRoles: allowedRoles,
    });
  };
}

module.exports = {
  generateToken,
  authenticate,
  requireRole,
  JWT_SECRET,
};
