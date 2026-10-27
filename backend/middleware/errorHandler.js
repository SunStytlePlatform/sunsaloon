import { logger } from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error(`[${req.id ?? '-'}] Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, err);
  res.status(err.status || 500).json({ error: 'Internal Server Error' });
}
