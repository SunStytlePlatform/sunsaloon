import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

// Phase 1 has no admin login yet: admin routes are open in development and closed in production.
export function adminAuth(req, res, next) {
  if (!env.isProduction) {
    logger.debug(`[${req.id}] adminAuth bypassed (APP_ENV=${env.appEnv})`);
    return next();
  }
  logger.warn(`[${req.id}] adminAuth blocked ${req.method} ${req.originalUrl} - admin authentication is not implemented`);
  return next(new ApiError(403, 'ADMIN_ACCESS_DISABLED', 'Admin endpoints are disabled until admin authentication is implemented'));
}
