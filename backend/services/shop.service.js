import { getSupabase } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { toApiError } from '../utils/supabaseError.js';

const PUBLIC_COLUMNS = 'id, shop_name, phone, address, email, description, logo_url';

// Phase 1 is single-salon: the salon is the (only) row in shop_settings, never chosen by the client.
export async function getCurrentShop() {
  logger.debug('shop.service: fetching current shop');
  const { data, error } = await getSupabase()
    .from('shop_settings')
    .select(PUBLIC_COLUMNS)
    .order('id')
    .limit(2);

  if (error) throw toApiError(error, 'fetching shop settings');
  if (!data.length) {
    logger.warn('shop.service: shop_settings table is empty');
    throw new ApiError(404, 'SHOP_NOT_FOUND', 'Salon details have not been configured yet');
  }
  if (data.length > 1) logger.warn('shop.service: shop_settings has more than one row - using the first one');

  return data[0];
}

export async function getShopById(id) {
  logger.debug(`shop.service: fetching shop ${id}`);
  const { data, error } = await getSupabase()
    .from('shop_settings')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw toApiError(error, 'fetching shop by id');
  if (!data) throw new ApiError(404, 'SHOP_NOT_FOUND', 'Salon not found');
  return data;
}
