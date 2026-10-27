import { logger } from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = Number(err.status || err.statusCode) || 500;
  const isServerError = status >= 500;
  const tag = `[${req.id ?? '-'}] ${req.method} ${req.originalUrl}`;

  if (isServerError) logger.error(`${tag} failed: ${err.message}`, err);
  else logger.warn(`${tag} rejected (${status}): ${err.message}`);

  // Response already streaming - let Express close the connection.
  if (res.headersSent) return next(err);

  res.status(status).json({
    // Only expose messages for client errors (e.g. malformed JSON body); hide internals on 5xx.
    error: isServerError ? 'Internal Server Error' : err.expose ? err.message : 'Bad Request',
    requestId: req.id,
  });
}
