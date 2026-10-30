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

// Failed-credential throttle per client IP, so the key cannot be guessed online. Successful requests are not counted.
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60_000;
const failures = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of failures) if (entry.resetAt <= now) failures.delete(ip);
}, FAILURE_WINDOW_MS).unref();

function failuresFor(ip) {
  const entry = failures.get(ip);
  if (!entry) return 0;
  if (entry.resetAt <= Date.now()) {
    failures.delete(ip);
    return 0;
  }
  return entry.count;
}

function recordFailure(ip) {
  const entry = failures.get(ip);
  if (entry && entry.resetAt > Date.now()) entry.count += 1;
  else failures.set(ip, { count: 1, resetAt: Date.now() + FAILURE_WINDOW_MS });
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

  const ip = req.ip ?? 'unknown';
  if (failuresFor(ip) >= MAX_FAILURES) {
    logger.warn(`[${req.id}] adminAuth locked out ${ip} after ${MAX_FAILURES} failed attempts`);
    return next(new ApiError(429, 'RATE_LIMITED', 'Too many failed admin login attempts, please try again later'));
  }

  if (!hasValidAdminKey(req)) {
    recordFailure(ip);
    logger.warn(`[${req.id}] adminAuth rejected ${req.method} ${req.originalUrl} - missing or invalid credentials`);
    return next(new ApiError(401, 'UNAUTHORIZED', 'Valid admin credentials are required'));
  }

  next();
}
