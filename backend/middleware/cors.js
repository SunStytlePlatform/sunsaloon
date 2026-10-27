import cors from 'cors';
import { env } from '../config/env.js';

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Requests without an Origin header (same-origin, curl, server-to-server) are allowed.
    callback(null, !origin || env.corsAllowedOrigins.includes(origin));
  },
});
