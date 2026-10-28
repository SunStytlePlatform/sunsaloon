import { Container } from '@/components/layout/Container';
import { ShopGrid } from '@/components/shops/ShopGrid';
import { getShops } from '@/lib/api/shops';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const shops = await getShops();
  return (
    <>
      <section className="bg-muted/60 py-16 sm:py-24">
        <Container className="text-center">
          <h1 className="font-serif text-4xl font-bold sm:text-5xl">Beauty, booked in minutes</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Choose your salon, pick a service and send an appointment request.
          </p>
        </Container>
      </section>
      <Container className="py-12">
        <h2 className="mb-6 font-serif text-2xl font-semibold">Our shops</h2>
        <ShopGrid shops={shops} />
      </Container>
    </>
  );
}
