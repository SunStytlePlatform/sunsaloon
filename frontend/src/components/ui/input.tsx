import * as React from 'react';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring aria-[invalid=true]:border-destructive';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, 'min-h-24 py-2', className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-medium text-foreground', className)} {...props} />;
}
