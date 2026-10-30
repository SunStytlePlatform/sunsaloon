import { Mail, MapPin, Phone } from 'lucide-react';
import type { Shop } from '@/types/shop';
import { ShopLogoImage } from './ShopLogoImage';

export function ShopLogo({ shop, className = 'h-20 w-20' }: { shop: Shop; className?: string }) {
  if (shop.logoUrl) return <ShopLogoImage src={shop.logoUrl} name={shop.name} className={className} />;
  return (
    <div
      aria-hidden
      className={`${className} flex items-center justify-center rounded-2xl bg-muted font-serif text-3xl font-bold text-primary`}
    >
      {shop.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ShopContactList({ shop }: { shop: Shop }) {
  const items = [
    { icon: MapPin, value: shop.address, label: 'Address' },
    { icon: Phone, value: shop.phone, label: 'Phone', href: shop.phone ? `tel:${shop.phone}` : undefined },
    { icon: Mail, value: shop.email, label: 'Email', href: shop.email ? `mailto:${shop.email}` : undefined },
  ].filter((i) => i.value);

  if (!items.length) return null;
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map(({ icon: Icon, value, label, href }) => (
        <li key={label} className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-label={label} />
          {href ? (
            <a href={href} className="hover:text-foreground hover:underline">
              {value}
            </a>
          ) : (
            <span>{value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
