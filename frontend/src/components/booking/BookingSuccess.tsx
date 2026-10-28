import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BookingSuccess({ onClose }: { onClose: () => void }) {
  return (
    <div role="status" className="py-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
      <h2 className="mt-4 font-serif text-xl font-semibold">Request submitted</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your appointment request has been submitted successfully. The salon will review your request and confirm your appointment.
      </p>
      <Button className="mt-6" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
