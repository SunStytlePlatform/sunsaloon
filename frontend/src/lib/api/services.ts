import 'server-only';
import { apiRequest } from './client';
import type { Service } from '@/types/service';

const REVALIDATE_SECONDS = 60;

type Raw = Record<string, unknown>;

function normalizeService(raw: Raw): Service {
  const price = raw.price === null || raw.price === undefined ? NaN : Number(raw.price);
  const duration = raw.duration_minutes === null || raw.duration_minutes === undefined ? NaN : Number(raw.duration_minutes);
  return {
    id: String(raw.id),
    name: typeof raw.name === 'string' ? raw.name : 'Service',
    description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : null,
    price: Number.isFinite(price) ? price : null,
    durationMinutes: Number.isFinite(duration) ? duration : null,
  };
}

export async function getServices(): Promise<Service[]> {
  const data = await apiRequest<Raw[] | null>('/api/services', { cache: { revalidate: REVALIDATE_SECONDS } });
  return (data ?? []).map(normalizeService);
}

export async function getServiceById(id: string): Promise<Service> {
  return normalizeService(await apiRequest<Raw>(`/api/services/${encodeURIComponent(id)}`, { cache: { revalidate: REVALIDATE_SECONDS } }));
}

/*
 * Services are common to all shops for now (no shop_id), so every shop gets the full list.
 * When services gain a shop association, filter here so the page code stays unchanged.
 */
export async function getServicesForShop(shopId: string): Promise<Service[]> {
  void shopId;
  return getServices();
}
