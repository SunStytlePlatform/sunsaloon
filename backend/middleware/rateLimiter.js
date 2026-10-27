import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

// Fixed-window, in-memory limiter keyed by client IP. Per process only - use a shared store if scaled out.
export function createRateLimiter({ name, max, windowMs }) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs);
  sweep.unref();

  return function rateLimiter(req, res, next) {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('RateLimit-Reset', String(resetSeconds));

    if (entry.count > max) {
      res.set('Retry-After', String(resetSeconds));
      logger.warn(`[${req.id}] ${name} rate limit exceeded (${entry.count}/${max})`);
      return next(new ApiError(429, 'RATE_LIMITED', 'Too many requests, please try again later'));
    }
    next();
  };
}
