import { ApiError } from './ApiError.js';
import { logger } from './logger.js';

// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const CONSTRAINT_CODES = new Set(['23502', '23514', '22P02', '22007', '22008', '22001']);

// Converts a Supabase/PostgREST error into an ApiError without leaking internal details to the client.
export function toApiError(error, context) {
  logger.error(`Supabase error while ${context}: ${error.message}`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });

  if (error.code === '23505') {
    return new ApiError(409, 'DUPLICATE_RECORD', 'A record with the same unique value already exists');
  }
  if (error.code === '23503') {
    return new ApiError(422, 'INVALID_REFERENCE', 'A referenced record does not exist');
  }
  if (CONSTRAINT_CODES.has(error.code)) {
    return new ApiError(422, 'CONSTRAINT_VIOLATION', 'The submitted data violates a database constraint');
  }
  // supabase-js reports network failures/timeouts with no Postgres code.
  if (!error.code || /fetch failed|network|timeout|abort|ECONN|ENOTFOUND/i.test(error.message ?? '')) {
    return new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is currently unavailable, please try again later');
  }
  return new ApiError(500, 'DATABASE_ERROR', 'A database error occurred');
}
