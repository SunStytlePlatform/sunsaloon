'use client';

import { Container } from '@/components/layout/Container';
import { ErrorState } from '@/components/shared/ErrorState';

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container className="py-16">
      <ErrorState title="Unable to load this shop" message="The shop could not be loaded right now. Please try again." onRetry={reset} />
    </Container>
  );
}
