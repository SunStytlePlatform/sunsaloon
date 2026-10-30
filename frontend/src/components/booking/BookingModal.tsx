'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { BookingRules } from '@/types/bookingRules';
import type { Service } from '@/types/service';
import { BookingForm } from './BookingForm';
import { BookingSuccess } from './BookingSuccess';

interface Props {
  service: Service | null;
  rules?: BookingRules | null;
  submitted: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export function BookingModal({ service, rules, submitted, busy, onBusyChange, onSuccess, onClose }: Props) {
  // While a request is in flight the dialog stays open (no X, Escape or outside click) so the outcome is always seen.
  const keepOpen = (event: Event) => {
    if (busy) event.preventDefault();
  };
  return (
    <Dialog open={!!service} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent closeDisabled={busy} onEscapeKeyDown={keepOpen} onInteractOutside={keepOpen}>
        {submitted ? (
          <>
            <DialogTitle className="sr-only">Booking request submitted</DialogTitle>
            <DialogDescription className="sr-only">Your appointment request was submitted.</DialogDescription>
            <BookingSuccess onClose={onClose} />
          </>
        ) : (
          service && (
            <>
              <DialogTitle>Book {service.name}</DialogTitle>
              <DialogDescription>Tell us when you would like to visit.</DialogDescription>
              <BookingForm key={service.id} serviceId={service.id} rules={rules} onSuccess={onSuccess} onBusyChange={onBusyChange} />
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
