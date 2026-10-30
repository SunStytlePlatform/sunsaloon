import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
const TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 5000; // whole process
const MAX_ENTRIES_PER_IP = 20; // one client cannot crowd out everyone else

const fingerprint = (body) => createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');

// Makes a retried POST safe: the same `Idempotency-Key` + same body from the same client replays the original success
// response instead of booking again (or failing with SLOT_TAKEN because of the customer's own first request).
// Only successful (2xx) responses are remembered, so a failed attempt can be corrected and resent with the same key.
// Keys are scoped to the caller's IP, and the store can never refuse service: when it is full the oldest finished
// entry is evicted, and a client over its own quota simply is not given replay protection.
// In-memory and per process, like the rate limiter.
export function createIdempotency() {
  const entries = new Map(); // insertion order = age
  const perIp = new Map();

  const release = (key) => {
    const entry = entries.get(key);
    if (!entry) return;
    entries.delete(key);
    const left = (perIp.get(entry.ip) ?? 1) - 1;
    if (left > 0) perIp.set(entry.ip, left);
    else perIp.delete(entry.ip);
  };

  const evictOldestFinished = () => {
    for (const [key, entry] of entries) {
      if (entry.response) return release(key);
    }
  };

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries) if (entry.expiresAt <= now) release(key);
  }, TTL_MS);
  sweep.unref();

  return async function idempotency(req, res, next) {
    const header = req.get('idempotency-key');
    if (header === undefined) return next();
    if (!KEY_RE.test(header)) {
      return next(new ApiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 8-64 letters, digits, "-" or "_"'));
    }

    const ip = req.ip ?? 'unknown';
    const key = `${ip} ${req.method} ${req.baseUrl}${req.path} ${header}`;
    const hash = fingerprint(req.body);
    let entry = entries.get(key);

    if (entry && entry.expiresAt <= Date.now()) {
      release(key);
      entry = undefined;
    }

    if (entry) {
      if (entry.hash !== hash) {
        return next(new ApiError(422, 'IDEMPOTENCY_KEY_REUSED', 'This Idempotency-Key was already used with a different request'));
      }
      // A concurrent duplicate waits for the first request to finish, then shares its outcome.
      await entry.done;
      if (entry.response) {
        logger.info(`[${req.id}] idempotent replay of ${req.method} ${req.originalUrl}`);
        res.set('Idempotent-Replay', 'true');
        return res.status(entry.response.status).json(entry.response.body);
      }
      return next(); // the first attempt failed, so this one is a fresh try
    }

    // No room for this client: process the request normally, just without replay protection.
    if ((perIp.get(ip) ?? 0) >= MAX_ENTRIES_PER_IP) return next();
    if (entries.size >= MAX_ENTRIES) evictOldestFinished();
    if (entries.size >= MAX_ENTRIES) return next();

    let finish;
    entry = { ip, hash, response: null, expiresAt: Date.now() + TTL_MS, done: new Promise((resolve) => { finish = resolve; }) };
    entries.set(key, entry);
    perIp.set(ip, (perIp.get(ip) ?? 0) + 1);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) entry.response = { status: res.statusCode, body };
      else release(key);
      finish();
      return originalJson(body);
    };
    // Client went away or the handler crashed before responding: release the key and any waiters.
    res.on('close', () => {
      if (!entry.response) release(key);
      finish();
    });

    next();
  };
}
