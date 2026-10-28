'use client';

import { Container } from '@/components/layout/Container';
import { ErrorState } from '@/components/shared/ErrorState';

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container className="py-16">
      <ErrorState
        title="Unable to load shops"
        message="We could not reach the booking service. Please check your connection and try again."
        onRetry={reset}
      />
    </Container>
  );
}
