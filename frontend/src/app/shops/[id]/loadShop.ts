import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ApiRequestError } from '@/lib/api/client';
import { getShopById } from '@/lib/api/shops';

// Deduplicates the fetch between generateMetadata and the page. Only real 404/400 (bad id) become notFound;
// backend outages propagate to the error boundary.
export const loadShop = cache(async (id: string) => {
  try {
    return await getShopById(id);
  } catch (err) {
    if (err instanceof ApiRequestError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
});
