import { loadShop } from './loadShop';

// Resolving the shop here, above the segment's loading.tsx boundary, means an unknown shop is answered with a real
// HTTP 404 instead of a 200 whose streamed body says "not found" (a soft 404 that search engines would index).
export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await loadShop(id);
  return children;
}
