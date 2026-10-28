import { Container } from '@/components/layout/Container';
import { ShopGridSkeleton } from '@/components/shared/LoadingSkeleton';

export default function Loading() {
  return (
    <Container className="py-12">
      <ShopGridSkeleton />
    </Container>
  );
}
