import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Shop } from '@/types/shop';
import { ShopContactList, ShopLogo } from './ShopParts';

export function ShopCard({ shop }: { shop: Shop }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <ShopLogo shop={shop} />
      <div className="flex-1 space-y-3">
        <h3 className="font-serif text-xl font-semibold">{shop.name}</h3>
        {shop.description && <p className="line-clamp-3 text-sm text-muted-foreground">{shop.description}</p>}
        <ShopContactList shop={shop} />
      </div>
      <Button asChild size="lg">
        <Link href={`/shops/${encodeURIComponent(shop.id)}`} aria-label={`View ${shop.name}`}>
          View Shop
        </Link>
      </Button>
    </article>
  );
}
