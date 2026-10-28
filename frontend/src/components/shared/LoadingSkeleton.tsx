import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/skeleton';

export function ShopGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading shops">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-64" />
      ))}
    </div>
  );
}

export function ShopDetailsSkeleton() {
  return (
    <Container className="space-y-6 py-10" >
      <div aria-busy="true" aria-label="Loading shop" className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-56" />
        <Skeleton className="h-12 w-48" />
      </div>
    </Container>
  );
}
