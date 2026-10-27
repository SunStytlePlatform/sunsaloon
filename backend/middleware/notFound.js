import { logger } from '../utils/logger.js';
import { errorBody } from '../utils/response.js';

export function notFound(req, res) {
  logger.warn(`[${req.id ?? '-'}] Route not found: ${req.method} ${req.originalUrl}`);
  res
    .status(404)
    .json(errorBody(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND', { requestId: req.id }));
}
