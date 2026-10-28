import { Clock } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Service } from '@/types/service';

export function ServiceCard({ service, onSelect }: { service: Service; onSelect: (service: Service) => void }) {
  const price = service.price !== null ? formatPrice(service.price) : null;
  return (
    <button
      type="button"
      onClick={() => onSelect(service)}
      className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
    >
      <span className="font-serif text-lg font-semibold">{service.name}</span>
      {service.description && <span className="text-sm text-muted-foreground">{service.description}</span>}
      {(service.durationMinutes !== null || price) && (
        <span className="mt-1 flex items-center justify-between text-sm">
          {service.durationMinutes !== null ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" /> {service.durationMinutes} min
            </span>
          ) : (
            <span />
          )}
          {price && <span className="font-semibold text-primary">{price}</span>}
        </span>
      )}
    </button>
  );
}
