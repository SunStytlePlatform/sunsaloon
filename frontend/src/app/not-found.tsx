import { Container } from '@/components/layout/Container';
import { BackHome, EmptyState } from '@/components/shared/EmptyState';

export default function NotFound() {
  return (
    <Container className="space-y-6 py-16 text-center">
      <EmptyState title="Page not found" message="The page you are looking for does not exist." />
      <BackHome />
    </Container>
  );
}
