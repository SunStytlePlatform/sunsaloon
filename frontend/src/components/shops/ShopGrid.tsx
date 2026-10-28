import { EmptyState } from '@/components/shared/EmptyState';
import type { Shop } from '@/types/shop';
import { ShopCard } from './ShopCard';

export function ShopGrid({ shops }: { shops: Shop[] }) {
  if (!shops.length) return <EmptyState title="No shops available" message="Please check back soon." />;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}
