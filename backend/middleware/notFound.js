import { logger } from '../utils/logger.js';

export function notFound(req, res) {
  logger.warn(`[${req.id ?? '-'}] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
