import { env } from '../config/env.js';
import { getCurrentDateTime } from '../utils/dateTime.js';

export function getHealth(req, res) {
  const { readable, iso } = getCurrentDateTime();
  res.json({
    status: `healthy at ${readable}`,
    timestamp: iso,
    customMessage: env.customMessage,
  });
}
