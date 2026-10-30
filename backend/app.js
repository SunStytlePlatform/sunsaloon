import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import apiRoutes from './routes/api.routes.js';

const app = express();

// Set by server.js once Next.js is prepared; until then (or if the frontend is unavailable) only the API is served.
let frontendHandler = null;
export function setFrontendHandler(handler) {
  frontendHandler = handler;
}

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

// nosniff, frame protection, HSTS, referrer policy, ... for everything. The page CSP is set by Next.js
// (frontend/next.config.ts) because it must allow the framework's inline scripts; API responses get a locked-down one.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(['/api', '/suns'], (req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  // Responses can hold customer details (admin list) or live availability: never let browsers or proxies keep them.
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));

app.use('/suns', requestLogger, routes);
app.use('/api', requestLogger, apiRoutes);

// Everything that is not the API is rendered by the Next.js frontend running in this same process.
app.use((req, res, next) => {
  const isApiPath = /^\/(api|suns)(\/|$)/.test(req.path);
  if (frontendHandler && !isApiPath) return frontendHandler(req, res);
  next();
});

app.use(notFound);
app.use(errorHandler);

export default app;
