'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Reassuring, escalating messages so the customer always knows the request is still alive.
export function SubmissionStatus({ pending }: { pending: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!pending) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [pending]);

  if (!pending) return null;
  const message =
    elapsed < 3
      ? 'Sending your request to the salon...'
      : elapsed < 8
        ? 'Almost there, saving your request...'
        : 'Still working on it. Please keep this window open, we will not lose your details.';

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      <span>{message}</span>
    </div>
  );
}
