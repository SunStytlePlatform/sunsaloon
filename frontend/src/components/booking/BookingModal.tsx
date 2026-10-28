'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Service } from '@/types/service';
import { BookingForm } from './BookingForm';
import { BookingSuccess } from './BookingSuccess';

interface Props {
  service: Service | null;
  submitted: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function BookingModal({ service, submitted, onSuccess, onClose }: Props) {
  return (
    <Dialog open={!!service} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
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
              <BookingForm key={service.id} serviceId={service.id} onSuccess={onSuccess} />
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
