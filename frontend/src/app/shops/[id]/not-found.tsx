import { Container } from '@/components/layout/Container';
import { BackHome, EmptyState } from '@/components/shared/EmptyState';

export default function ShopNotFound() {
  return (
    <Container className="space-y-6 py-16 text-center">
      <EmptyState title="Shop not found" message="This shop does not exist or is no longer available." />
      <BackHome />
    </Container>
  );
}
