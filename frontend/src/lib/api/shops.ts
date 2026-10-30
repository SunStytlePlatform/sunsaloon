import 'server-only';
import { apiRequest } from './client';
import { normalizeShop } from './normalizeShop';
import type { Shop } from '@/types/shop';

const REVALIDATE_SECONDS = 60;

type Raw = Record<string, unknown>;

// GET /api/shops currently returns one shop object (single-salon backend); a list is also accepted for multi-shop.
export async function getShops(): Promise<Shop[]> {
  const data = await apiRequest<Raw | Raw[] | null>('/api/shops', { cache: { revalidate: REVALIDATE_SECONDS } });
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]).map(normalizeShop);
}

export async function getShopById(id: string): Promise<Shop> {
  const data = await apiRequest<Raw>(`/api/shops/${encodeURIComponent(id)}`, { cache: { revalidate: REVALIDATE_SECONDS } });
  return normalizeShop(data);
}
