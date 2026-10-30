import { env } from '../config/env.js';
import { hasValidAdminKey } from '../middleware/adminAuth.js';
import { getCurrentDateTime } from '../utils/dateTime.js';
import { logger } from '../utils/logger.js';

export function getHealth(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered health.controller.getHealth`);
    const { readable, iso } = getCurrentDateTime();
    const body = { status: `healthy at ${readable}`, timestamp: iso };
    // Configuration echo is only for callers holding the admin key.
    if (hasValidAdminKey(req)) body.customMessage = env.customMessage;
    logger.debug(`[${req.id}] health.controller response`, body);
    res.json(body);
  } catch (err) {
    logger.error(`[${req.id}] health.controller.getHealth failed: ${err.message}`);
    next(err);
  }
}
