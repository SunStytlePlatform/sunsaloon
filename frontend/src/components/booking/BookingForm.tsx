'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { newIdempotencyKey, useBooking, type BookingError } from '@/hooks/useBooking';
import { SubmissionStatus } from './SubmissionStatus';
import {
  addDays,
  createAppointmentSchema,
  salonDateTimeParts,
  type AppointmentFormInput,
  type AppointmentFormValues,
} from '@/lib/validations/appointment.schema';
import type { BookingRules } from '@/types/bookingRules';

const FIELDS = ['customer_name', 'customer_phone', 'customer_email', 'appointment_date', 'appointment_time', 'notes'] as const;

interface Props {
  serviceId: string;
  rules?: BookingRules | null;
  onSuccess: () => void;
  onBusyChange?: (busy: boolean) => void;
}

export function BookingForm({ serviceId, rules, onSuccess, onBusyChange }: Props) {
  const { mutateAsync, isPending: submitting, error: apiError, reset } = useBooking();
  const schema = useMemo(() => createAppointmentSchema(rules), [rules]);
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
      website: '',
    },
  });

  // The dialog must not be closable mid-request, otherwise the customer never sees the outcome and may resubmit.
  useEffect(() => {
    onBusyChange?.(submitting);
    return () => onBusyChange?.(false);
  }, [submitting, onBusyChange]);

  // Same key for retries of the same details; a new key as soon as the customer changes anything.
  const attempt = useRef({ key: newIdempotencyKey(), signature: '' });

  const onSubmit = handleSubmit(async (values) => {
    reset();
    const signature = JSON.stringify(values);
    if (signature !== attempt.current.signature) attempt.current = { key: newIdempotencyKey(), signature };
    try {
      await mutateAsync({ values: { ...values, service_id: serviceId }, idempotencyKey: attempt.current.key });
      onSuccess();
    } catch (err) {
      // Values stay in the form on failure so the customer can correct and retry.
      (err as BookingError).fieldErrors?.forEach(({ field, message }) => {
        if ((FIELDS as readonly string[]).includes(field)) setError(field as (typeof FIELDS)[number], { message });
      });
    }
  });

  const today = salonDateTimeParts(new Date(), rules?.timeZone).date;

  const fields: { name: (typeof FIELDS)[number]; label: string; props: React.InputHTMLAttributes<HTMLInputElement> }[] = [
    { name: 'customer_name', label: 'Full name', props: { type: 'text', autoComplete: 'name' } },
    { name: 'customer_phone', label: 'Phone number', props: { type: 'tel', autoComplete: 'tel', inputMode: 'tel' } },
    { name: 'customer_email', label: 'Email address', props: { type: 'email', autoComplete: 'email' } },
    {
      name: 'appointment_date',
      label: 'Preferred date',
      props: { type: 'date', min: today, ...(rules ? { max: addDays(today, rules.maxAdvanceDays) } : {}) },
    },
    {
      name: 'appointment_time',
      label: rules ? `Preferred time (${rules.openingTime}-${rules.closingTime})` : 'Preferred time',
      props: {
        type: 'time',
        ...(rules ? { min: rules.openingTime, max: rules.closingTime, step: rules.slotIntervalMinutes * 60 } : {}),
      },
    },
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

      {/* Honeypot: off-screen and skipped by keyboard and screen readers; only bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
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
