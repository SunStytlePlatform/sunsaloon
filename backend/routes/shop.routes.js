import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { validateParams } from '../middleware/validate.js';
import { validateIdParams } from '../utils/validators.js';
import { getShop, getShopByIdController } from '../controllers/shop.controller.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/shop.routes.js`);
  next();
});

router.get('/', getShop);
router.get('/:id', validateParams(validateIdParams), getShopByIdController);

export default router;
