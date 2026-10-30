import { checkDBConnection } from '../config/db.js';
import { hasValidAdminKey } from '../middleware/adminAuth.js';
import { getCurrentDateTime } from '../utils/dateTime.js';
import { logger } from '../utils/logger.js';

// Each check is an outbound call to Supabase, so a public endpoint must not trigger one per request.
const CACHE_MS = 10_000;
let cached = null;
let inFlight = null;

async function cachedCheck() {
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  inFlight ??= checkDBConnection()
    .then((result) => {
      cached = { result, expiresAt: Date.now() + CACHE_MS };
      return result;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

export async function getDBStatus(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered db.controller.getDBStatus`);
    const { connected, message } = await cachedCheck();
    // Callers without the admin key only learn up/down; the message can name the upstream host or error.
    const body = hasValidAdminKey(req)
      ? { connected, message, checkedAt: getCurrentDateTime().readable }
      : { connected };
    logger.debug(`[${req.id}] db.controller response`, body);
    res.status(connected ? 200 : 503).json(body);
  } catch (err) {
    logger.error(`[${req.id}] db.controller.getDBStatus failed: ${err.message}`);
    next(err);
  }
}
