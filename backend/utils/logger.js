import { redactText, redactValue } from './redact.js';

// Levels from least to most verbose. LOG_LEVEL=null|none|off|silent disables all logs.
const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const SILENT_VALUES = ['null', 'none', 'off', 'silent'];
const DEFAULT_LEVEL = 'info';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const LEVEL_COLORS = {
  error: COLORS.red,
  warn: COLORS.yellow,
  info: COLORS.cyan,
  http: COLORS.magenta,
  debug: COLORS.gray,
};

const rawLevel = (process.env.LOG_LEVEL ?? DEFAULT_LEVEL).trim().toLowerCase();
const isSilent = SILENT_VALUES.includes(rawLevel);
const isKnown = Object.hasOwn(LEVELS, rawLevel);
const levelName = isSilent ? 'none' : isKnown ? rawLevel : DEFAULT_LEVEL;
const threshold = isSilent ? -1 : LEVELS[levelName];

function write(level, message, meta, color = LEVEL_COLORS[level]) {
  if (LEVELS[level] > threshold) return;
  const line = `${color}[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${redactText(message)}${COLORS.reset}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta === undefined) out(line);
  else out(line, redactValue(meta));
}

export const logger = {
  level: levelName,
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  http: (message, meta) => write('http', message, meta),
  debug: (message, meta) => write('debug', message, meta),

  // Incoming API request (blue).
  ingress: (message, meta) => write('http', message, meta, COLORS.blue),

  // Outgoing API response: green on success, red on 4xx/5xx (5xx also logged at error level).
  egress(message, statusCode, meta) {
    if (statusCode >= 500) write('error', message, meta, COLORS.red);
    else if (statusCode >= 400) write('warn', message, meta, COLORS.red);
    else write('http', message, meta, COLORS.green);
  },
};

if (!isSilent && !isKnown) {
  logger.warn(`Unknown LOG_LEVEL "${rawLevel}", falling back to "${DEFAULT_LEVEL}"`);
}
