'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;

export function DialogContent({
  className,
  children,
  closeDisabled = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { closeDisabled?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-border bg-card p-6 text-card-foreground shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          disabled={closeDisabled}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title className={cn('font-serif text-xl font-semibold', className)} {...props} />
);

export const DialogDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description className={cn('mt-1 text-sm text-muted-foreground', className)} {...props} />
);
