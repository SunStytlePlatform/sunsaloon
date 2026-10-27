import { Router } from 'express';
import { getDBStatus } from '../controllers/db.controller.js';

const router = Router();

router.get('/', getDBStatus);

export default router;
