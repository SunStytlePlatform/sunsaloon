import { EmptyState } from '@/components/shared/EmptyState';
import type { Service } from '@/types/service';
import { ServiceCard } from './ServiceCard';

export function ServiceList({ services, onSelect }: { services: Service[]; onSelect: (service: Service) => void }) {
  if (!services.length) {
    return <EmptyState title="No services available" message="This shop has no bookable services right now." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} onSelect={onSelect} />
      ))}
    </div>
  );
}
