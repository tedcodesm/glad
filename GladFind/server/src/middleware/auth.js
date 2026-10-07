// Authentication and authorisation middleware.
import { config } from '../config/env.js';
import { verify } from '../utils/jwt.js';
import { err } from '../utils/http.js';

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

/** Hard gate: no valid token means 401. */
export function authenticate(req, res, next) {
  const token = readBearer(req);
  if (!token) return err(res, 401, 'Missing authorization token');

  try {
    req.user = verify(token, config.jwtSecret);
    return next();
  } catch (e) {
    err(res, 401, e.message);
  }
}

/**
 * Soft gate used by endpoints that work for guests but personalise for members
 * — booking an appointment, for example. Never rejects.
 */
export function optionalAuth(req, res, next) {
  const token = readBearer(req);
  if (token) {
    try {
      req.user = verify(token, config.jwtSecret);
    } catch {
      // An invalid token is treated as "not signed in" rather than an error,
      // so a stale client token cannot block an anonymous booking.
      req.user = undefined;
    }
  }
  return next();
}

/** Must run after `authenticate` (or `optionalAuth` on a protected route). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return err(res, 401, 'Not authenticated');
    if (!roles.includes(req.user.role)) return err(res, 403, 'Insufficient permissions');
    return next();
  };
}