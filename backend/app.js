import path from 'node:path';
import express from 'express';
import { corsMiddleware } from './middleware/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const FRONTEND_DIR = path.resolve(import.meta.dirname, '../frontend/out');

const app = express();

app.use(corsMiddleware);
app.use(express.json());

app.use('/suns', requestLogger, routes);

// Serve the statically exported Next.js frontend (built by `npm run build` at the repo root).
app.use(express.static(FRONTEND_DIR));

app.use(notFound);
app.use(errorHandler);

export default app;
