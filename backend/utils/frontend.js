import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { logger } from './logger.js';

const FRONTEND_DIR = path.resolve(import.meta.dirname, '../../frontend');

// Loads the Next.js app from ../frontend so one Node process serves both the API and the website.
// Returns null (API-only mode) when the frontend is not installed or, in production, not built.
export async function createFrontendHandler() {
  let next;
  try {
    // Resolved from the frontend folder so the backend needs no `next` dependency of its own.
    next = createRequire(path.join(FRONTEND_DIR, 'package.json'))('next');
  } catch {
    logger.warn('Frontend not installed (run `npm install` in frontend/) - serving the API only');
    return null;
  }

  const dev = process.env.NODE_ENV !== 'production';
  if (!dev && !fs.existsSync(path.join(FRONTEND_DIR, '.next', 'BUILD_ID'))) {
    logger.warn('Frontend is not built (run `npm run build --prefix frontend`) - serving the API only');
    return null;
  }

  try {
    const nextApp = next({ dev, dir: FRONTEND_DIR });
    await nextApp.prepare();
    logger.info(`Frontend ready (${dev ? 'development' : 'production'} mode)`);
    return { handler: nextApp.getRequestHandler(), upgrade: nextApp.getUpgradeHandler?.() };
  } catch (err) {
    logger.error(`Frontend failed to start - serving the API only: ${err.message}`, err);
    return null;
  }
}
