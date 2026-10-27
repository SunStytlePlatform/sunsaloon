import { getSupabase } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { toApiError } from '../utils/supabaseError.js';

const COLUMNS = 'id, name, phone, email';
const UNIQUE_VIOLATION = '23505';

async function findByPhone(phone) {
  const { data, error } = await getSupabase().from('customers').select(COLUMNS).eq('phone', phone).maybeSingle();
  if (error) throw toApiError(error, 'looking up customer');
  return data;
}

// Phone is unique per customer; an existing record is reused as-is (name/email are not overwritten).
export async function findOrCreateCustomer({ name, phone, email }) {
  const existing = await findByPhone(phone);
  if (existing) {
    logger.debug(`customer.service: reusing existing customer ${existing.id}`);
    return { customer: existing, created: false };
  }

  const { data, error } = await getSupabase()
    .from('customers')
    .insert({ name, phone, email })
    .select(COLUMNS)
    .single();

  if (!error) {
    logger.info(`customer.service: created customer ${data.id}`);
    return { customer: data, created: true };
  }

  // A concurrent booking inserted the same phone between our lookup and insert.
  if (error.code === UNIQUE_VIOLATION) {
    logger.debug('customer.service: phone inserted concurrently - re-reading customer');
    const raced = await findByPhone(phone);
    if (raced) return { customer: raced, created: false };
  }
  throw toApiError(error, 'creating customer');
}
