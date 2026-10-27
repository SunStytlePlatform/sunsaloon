import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { validateParams } from '../middleware/validate.js';
import { validateIdParams } from '../utils/validators.js';
import { getService, listServices } from '../controllers/service.controller.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/service.routes.js`);
  next();
});

router.get('/', listServices);
router.get('/:id', validateParams(validateIdParams), getService);

export default router;
