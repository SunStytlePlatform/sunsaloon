import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border p-10 text-center">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

export function BackHome() {
  return (
    <Button asChild variant="outline">
      <Link href="/">Back to all shops</Link>
    </Button>
  );
}
