import { logger } from '../utils/logger.js';

const DEFAULT_PORT = 5000;

function parsePort(raw) {
  if (!raw) return DEFAULT_PORT;
  const port = Number(raw);
  if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  logger.warn(`Invalid port "${raw}", falling back to ${DEFAULT_PORT}`);
  return DEFAULT_PORT;
}

function parseUrl(raw, name) {
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    logger.error(`${name} is not a valid URL - ignoring it`);
    return '';
  }
}

export const env = {
  // Render injects PORT; fall back to BACKEND_PORT from .env locally.
  port: parsePort(process.env.PORT || process.env.BACKEND_PORT),
  customMessage: process.env.CUSTOM_MESSAGE ?? '(CUSTOM_MESSAGE not set - .env not loaded)',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabaseUrl: parseUrl(process.env.SUPABASE_URL, 'SUPABASE_URL'),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};
