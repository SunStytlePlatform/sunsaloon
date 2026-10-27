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

const APP_ENVS = ['development', 'production'];

// Defaults to production so admin endpoints stay closed unless development is explicitly chosen.
function parseAppEnv(raw) {
  const value = (raw ?? '').trim().toLowerCase();
  if (APP_ENVS.includes(value)) return value;
  logger.warn(`APP_ENV ${value ? `"${value}" is invalid` : 'is not set'} - defaulting to "production"`);
  return 'production';
}

const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

function parseTimeZone(raw) {
  const timeZone = raw?.trim() || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    logger.error(`SALON_TIMEZONE "${raw}" is not a valid IANA time zone - using ${DEFAULT_TIME_ZONE}`);
    return DEFAULT_TIME_ZONE;
  }
}

function parsePositiveInt(raw, fallback, name) {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (Number.isInteger(value) && value > 0) return value;
  logger.warn(`${name} "${raw}" is not a positive integer - using ${fallback}`);
  return fallback;
}

const appEnv = parseAppEnv(process.env.APP_ENV);

export const env = {
  appEnv,
  isProduction: appEnv === 'production',
  // Render injects PORT; fall back to BACKEND_PORT from .env locally.
  port: parsePort(process.env.PORT || process.env.BACKEND_PORT),
  customMessage: process.env.CUSTOM_MESSAGE ?? '(CUSTOM_MESSAGE not set - .env not loaded)',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabaseUrl: parseUrl(process.env.SUPABASE_URL, 'SUPABASE_URL'),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  // Used to decide whether a booking date/time is already in the past.
  salonTimeZone: parseTimeZone(process.env.SALON_TIMEZONE),
  bookingRateLimit: {
    max: parsePositiveInt(process.env.BOOKING_RATE_LIMIT_MAX, 10, 'BOOKING_RATE_LIMIT_MAX'),
    windowMs: parsePositiveInt(process.env.BOOKING_RATE_LIMIT_WINDOW_MINUTES, 15, 'BOOKING_RATE_LIMIT_WINDOW_MINUTES') * 60_000,
  },
  // Number of reverse proxies in front of the app (Render = 1) so req.ip is the real client IP.
  trustProxy: parsePositiveInt(process.env.TRUST_PROXY, process.env.RENDER ? 1 : 0, 'TRUST_PROXY') || false,
};
