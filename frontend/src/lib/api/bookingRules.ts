import 'server-only';
import { apiRequest } from './client';
import type { BookingRules } from '@/types/bookingRules';

const REVALIDATE_SECONDS = 60;

// Optional: when the rules cannot be loaded the form simply skips its own checks and the server still enforces them.
export async function getBookingRules(): Promise<BookingRules | null> {
  try {
    const data = await apiRequest<Partial<BookingRules> | null>('/api/booking-rules', { cache: { revalidate: REVALIDATE_SECONDS } });
    if (
      data &&
      typeof data.timeZone === 'string' &&
      typeof data.openingTime === 'string' &&
      typeof data.closingTime === 'string' &&
      Number.isInteger(data.slotIntervalMinutes) &&
      Number.isInteger(data.maxAdvanceDays)
    ) {
      return data as BookingRules;
    }
    return null;
  } catch {
    return null;
  }
}
