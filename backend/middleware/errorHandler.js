import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { errorBody } from '../utils/response.js';

const DEFAULT_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
};

function describe(err, status) {
  if (err instanceof ApiError) return { code: err.code, message: err.message, details: err.details };
  if (err.type === 'entity.parse.failed') return { code: 'INVALID_JSON', message: 'Request body contains invalid JSON' };
  if (status >= 500) return { code: 'INTERNAL_ERROR', message: 'Internal server error' };
  // Errors from Express/body-parser set `expose` when their message is safe for clients.
  return { code: DEFAULT_CODES[status] ?? 'REQUEST_ERROR', message: err.expose ? err.message : 'Bad request' };
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = Number(err.status || err.statusCode) || 500;
  const tag = `[${req.id ?? '-'}] ${req.method} ${req.originalUrl}`;

  if (status >= 500) {
    // ApiErrors are expected failures (already logged at source); unknown errors need the stack.
    if (err instanceof ApiError) logger.error(`${tag} failed (${status} ${err.code}): ${err.message}`);
    else logger.error(`${tag} failed: ${err.message}`, err);
  } else {
    logger.warn(`${tag} rejected (${status}${err.code ? ` ${err.code}` : ''}): ${err.message}`);
  }

  // Response already streaming - let Express close the connection.
  if (res.headersSent) return next(err);

  const { code, message, details } = describe(err, status);
  res.status(status).json(errorBody(message, code, { details, requestId: req.id }));
}
