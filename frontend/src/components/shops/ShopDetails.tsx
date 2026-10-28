import type { Shop } from '@/types/shop';
import { ShopContactList, ShopLogo } from './ShopParts';

export function ShopDetails({ shop }: { shop: Shop }) {
  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:p-8">
      <ShopLogo shop={shop} className="h-28 w-28 shrink-0" />
      <div className="space-y-4">
        <h1 className="font-serif text-3xl font-bold">{shop.name}</h1>
        {shop.description && <p className="text-muted-foreground">{shop.description}</p>}
        <ShopContactList shop={shop} />
      </div>
    </section>
  );
}
