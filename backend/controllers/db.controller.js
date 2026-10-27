import { checkDBConnection } from '../config/db.js';
import { getCurrentDateTime } from '../utils/dateTime.js';
import { logger } from '../utils/logger.js';

export async function getDBStatus(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered db.controller.getDBStatus`);
    const { connected, message } = await checkDBConnection();
    const body = { connected, message, checkedAt: getCurrentDateTime().readable };
    logger.debug(`[${req.id}] db.controller response`, body);
    res.status(connected ? 200 : 503).json(body);
  } catch (err) {
    logger.error(`[${req.id}] db.controller.getDBStatus failed: ${err.message}`);
    next(err);
  }
}
