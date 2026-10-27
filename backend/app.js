import path from 'node:path';
import express from 'express';
import { env } from './config/env.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import apiRoutes from './routes/api.routes.js';

const FRONTEND_DIR = path.resolve(import.meta.dirname, '../frontend/out');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));

app.use('/suns', requestLogger, routes);
app.use('/api', requestLogger, apiRoutes);

// Serve the statically exported Next.js frontend (built by `npm run build` at the repo root).
app.use(express.static(FRONTEND_DIR));

app.use(notFound);
app.use(errorHandler);

export default app;
