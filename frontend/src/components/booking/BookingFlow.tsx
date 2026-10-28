'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { ServiceList } from '@/components/services/ServiceList';
import { useServices } from '@/hooks/useServices';
import type { Service } from '@/types/service';
import { BookingModal } from './BookingModal';

// Services are fetched on the server for the first render; TanStack Query takes over for retries.
export function BookingFlow({ services: initial, servicesFailed }: { services?: Service[]; servicesFailed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Service | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { data: services, isPending, isFetching, isError, error, refetch } = useServices(servicesFailed ? undefined : initial, open);

  function close() {
    setSelected(null);
    setSubmitted(false);
  }

  return (
    <section aria-labelledby="book-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="book-heading" className="font-serif text-2xl font-semibold">
          Services
        </h2>
        {!open && (
          <Button size="lg" onClick={() => setOpen(true)}>
            Book Slot
          </Button>
        )}
      </div>

      {open && (
        <div aria-live="polite" aria-busy={isFetching}>
          {isPending && !isError ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading available services...
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            </div>
          ) : isError ? (
            <ErrorState
              title="Unable to load services"
              message={`${error.message} We already retried a few times.`}
              onRetry={() => refetch()}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select a service to request an appointment.</p>
              <ServiceList services={services ?? []} onSelect={setSelected} />
            </div>
          )}
        </div>
      )}

      <BookingModal
        service={selected}
        submitted={submitted}
        onSuccess={() => {
          setSubmitted(true);
          toast.success('Appointment request submitted');
        }}
        onClose={close}
      />
    </section>
  );
}
