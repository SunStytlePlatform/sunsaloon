import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import healthRoutes from './health.routes.js';
import dbRoutes from './db.routes.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/index.js`);
  next();
});

// Public diagnostics: a generous per-IP cap keeps them from being used to hammer the server or Supabase.
router.use(createRateLimiter({ name: 'diagnostics', max: 60, windowMs: 60_000 }));

router.use('/health', healthRoutes);
router.use('/db', dbRoutes);

export default router;
