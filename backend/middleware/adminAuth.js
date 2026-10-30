import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

// Hash both sides so timingSafeEqual always compares equal-length buffers (and length is not leaked).
const digest = (value) => createHash('sha256').update(String(value)).digest();

function bearerToken(req) {
  const header = req.get?.('authorization') ?? req.headers?.authorization ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

// True only when ADMIN_API_KEY is configured and the request carries it. Also used to unlock extra diagnostics detail.
export function hasValidAdminKey(req) {
  const token = bearerToken(req);
  return Boolean(env.adminApiKey && token && timingSafeEqual(digest(token), digest(env.adminApiKey)));
}

// Admin routes require `Authorization: Bearer <ADMIN_API_KEY>` in every environment.
// Without ADMIN_API_KEY configured they stay closed.
export function adminAuth(req, res, next) {
  if (!env.adminApiKey) {
    logger.warn(`[${req.id}] adminAuth blocked ${req.method} ${req.originalUrl} - ADMIN_API_KEY is not configured`);
    return next(new ApiError(403, 'ADMIN_ACCESS_DISABLED', 'Admin endpoints are disabled until ADMIN_API_KEY is configured'));
  }

  if (!hasValidAdminKey(req)) {
    logger.warn(`[${req.id}] adminAuth rejected ${req.method} ${req.originalUrl} - missing or invalid credentials`);
    return next(new ApiError(401, 'UNAUTHORIZED', 'Valid admin credentials are required'));
  }

  next();
}
