'use client';

import { useEffect } from 'react';

// Next.js error boundary: catches render errors in the page instead of showing a blank screen.
export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled UI error:', error);
  }, [error]);

  return (
    <main>
      <h1>Something went wrong</h1>
      <p className="error">{error?.message || 'An unexpected error occurred.'}</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
