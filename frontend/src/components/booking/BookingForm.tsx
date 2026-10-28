'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { useBooking, type BookingError } from '@/hooks/useBooking';
import { SubmissionStatus } from './SubmissionStatus';
import {
  createAppointmentSchema,
  localDateTimeParts,
  type AppointmentFormInput,
  type AppointmentFormValues,
} from '@/lib/validations/appointment.schema';

const schema = createAppointmentSchema({ checkPast: true });
const FIELDS = ['customer_name', 'customer_phone', 'customer_email', 'appointment_date', 'appointment_time', 'notes'] as const;

export function BookingForm({ serviceId, onSuccess }: { serviceId: string; onSuccess: () => void }) {
  const { mutateAsync, isPending: submitting, error: apiError, reset } = useBooking();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AppointmentFormInput, unknown, AppointmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      service_id: serviceId,
      appointment_date: '',
      appointment_time: '',
      notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    reset();
    try {
      await mutateAsync({ ...values, service_id: serviceId });
      onSuccess();
    } catch (err) {
      // Values stay in the form on failure so the customer can correct and retry.
      (err as BookingError).fieldErrors?.forEach(({ field, message }) => {
        if ((FIELDS as readonly string[]).includes(field)) setError(field as (typeof FIELDS)[number], { message });
      });
    }
  });

  const today = localDateTimeParts(new Date()).date;

  const fields: { name: (typeof FIELDS)[number]; label: string; props: React.InputHTMLAttributes<HTMLInputElement> }[] = [
    { name: 'customer_name', label: 'Full name', props: { type: 'text', autoComplete: 'name' } },
    { name: 'customer_phone', label: 'Phone number', props: { type: 'tel', autoComplete: 'tel', inputMode: 'tel' } },
    { name: 'customer_email', label: 'Email address', props: { type: 'email', autoComplete: 'email' } },
    { name: 'appointment_date', label: 'Preferred date', props: { type: 'date', min: today } },
    { name: 'appointment_time', label: 'Preferred time', props: { type: 'time' } },
  ];

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={submitting} className="mt-5">
      <fieldset disabled={submitting} className="space-y-4">
      {fields.map(({ name, label, props }) => (
        <div key={name} className="space-y-1.5">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
            {...props}
            {...register(name)}
          />
          {errors[name] && (
            <p id={`${name}-error`} className="text-xs text-destructive">
              {errors[name]?.message}
            </p>
          )}
        </div>
      ))}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" aria-invalid={!!errors.notes} {...register('notes')} />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
      </div>

      <SubmissionStatus pending={submitting} />
      {apiError && (
        <p role="alert" className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">
          {apiError.message} Your details are saved here, so you can try again.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        This is an appointment request. The salon will review it and confirm your appointment.
      </p>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? 'Submitting...' : apiError ? 'Try again' : 'Request appointment'}
      </Button>
      </fieldset>
    </form>
  );
}
