import cors from 'cors';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Requests without an Origin header (same-origin, curl, server-to-server) are allowed.
    const allowed = !origin || env.corsAllowedOrigins.includes(origin);
    if (!allowed) logger.warn(`CORS: blocked request from origin ${origin}`);
    else if (origin) logger.debug(`CORS: allowed origin ${origin}`);
    callback(null, allowed);
  },
});
