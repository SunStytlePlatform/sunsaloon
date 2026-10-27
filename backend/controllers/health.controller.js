import { env } from '../config/env.js';
import { getCurrentDateTime } from '../utils/dateTime.js';
import { logger } from '../utils/logger.js';

export function getHealth(req, res) {
  logger.debug(`[${req.id}] entered health.controller.getHealth`);
  const { readable, iso } = getCurrentDateTime();
  const body = {
    status: `healthy at ${readable}`,
    timestamp: iso,
    customMessage: env.customMessage,
  };
  logger.debug(`[${req.id}] health.controller response`, body);
  res.json(body);
}
