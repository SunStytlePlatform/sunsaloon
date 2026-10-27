import { getSupabase } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { toApiError } from '../utils/supabaseError.js';

const PUBLIC_COLUMNS = 'id, name, description, price, duration_minutes';

export async function listActiveServices() {
  logger.debug('service.service: listing active services');
  const { data, error } = await getSupabase()
    .from('services')
    .select(PUBLIC_COLUMNS)
    .eq('is_active', true)
    .order('name');

  if (error) throw toApiError(error, 'listing services');
  logger.debug(`service.service: found ${data.length} active service(s)`);
  return data;
}

// Inactive services are treated as not found so they can't be booked.
export async function getActiveServiceById(id) {
  logger.debug(`service.service: fetching service ${id}`);
  const { data, error } = await getSupabase()
    .from('services')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw toApiError(error, 'fetching service');
  if (!data) throw new ApiError(404, 'SERVICE_NOT_FOUND', 'The selected service does not exist or is not available');
  return data;
}
