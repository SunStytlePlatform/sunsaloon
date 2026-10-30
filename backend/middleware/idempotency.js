import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
const TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 5000;

const fingerprint = (body) => createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');

// Makes a retried POST safe: the same `Idempotency-Key` + same body replays the original success response instead of
// booking again (or failing with SLOT_TAKEN because of the customer's own first request). Only successful (2xx)
// responses are remembered, so a failed attempt can be corrected and resent with the same key.
// In-memory and per process, like the rate limiter.
export function createIdempotency() {
  const entries = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries) if (entry.expiresAt <= now) entries.delete(key);
  }, TTL_MS);
  sweep.unref();

  return async function idempotency(req, res, next) {
    const header = req.get('idempotency-key');
    if (header === undefined) return next();
    if (!KEY_RE.test(header)) {
      return next(new ApiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 8-64 letters, digits, "-" or "_"'));
    }

    const key = `${req.method} ${req.baseUrl}${req.path} ${header}`;
    const hash = fingerprint(req.body);
    let entry = entries.get(key);

    if (entry && entry.expiresAt <= Date.now()) {
      entries.delete(key);
      entry = undefined;
    }

    if (entry) {
      if (entry.hash !== hash) {
        return next(new ApiError(422, 'IDEMPOTENCY_KEY_REUSED', 'This Idempotency-Key was already used with a different request'));
      }
      // A concurrent duplicate waits for the first request to finish, then shares its outcome.
      await entry.done;
      if (entry.response) {
        logger.info(`[${req.id}] idempotent replay of ${key}`);
        res.set('Idempotent-Replay', 'true');
        return res.status(entry.response.status).json(entry.response.body);
      }
      return next(); // the first attempt failed, so this one is a fresh try
    }

    if (entries.size >= MAX_ENTRIES) {
      return next(new ApiError(503, 'SERVICE_BUSY', 'The server is busy, please try again shortly'));
    }

    let finish;
    entry = { hash, response: null, expiresAt: Date.now() + TTL_MS, done: new Promise((resolve) => { finish = resolve; }) };
    entries.set(key, entry);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) entry.response = { status: res.statusCode, body };
      else entries.delete(key);
      finish();
      return originalJson(body);
    };
    // Client went away or the handler crashed before responding: release the key and any waiters.
    res.on('close', () => {
      if (!entry.response) entries.delete(key);
      finish();
    });

    next();
  };
}
