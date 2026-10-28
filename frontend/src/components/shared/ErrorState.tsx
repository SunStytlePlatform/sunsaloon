'use client';

import { Button } from '@/components/ui/button';

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-destructive/40 p-10 text-center">
      <h2 className="font-serif text-xl font-semibold text-destructive">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
