import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { ShopDetails } from '@/components/shops/ShopDetails';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { getBookingRules } from '@/lib/api/bookingRules';
import { getServicesForShop } from '@/lib/api/services';
import { loadShop } from './loadShop';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const shop = await loadShop(id);
  return { title: shop.name, description: shop.description ?? `Book an appointment at ${shop.name}.` };
}

export default async function ShopPage({ params }: Params) {
  const { id } = await params;
  const shop = await loadShop(id);

  let services: Awaited<ReturnType<typeof getServicesForShop>> | undefined;
  let servicesFailed = false;
  const [servicesResult, rules] = await Promise.all([
    getServicesForShop(shop.id).then(
      (value) => ({ value }),
      () => null,
    ),
    getBookingRules(),
  ]);
  if (servicesResult) services = servicesResult.value;
  else servicesFailed = true;

  return (
    <Container className="space-y-8 py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All shops
      </Link>
      <ShopDetails shop={shop} />
      <BookingFlow services={services} servicesFailed={servicesFailed} rules={rules} />
    </Container>
  );
}
