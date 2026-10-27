import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { getDBStatus } from '../controllers/db.controller.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/db.routes.js`);
  next();
});

router.get('/', getDBStatus);

export default router;
