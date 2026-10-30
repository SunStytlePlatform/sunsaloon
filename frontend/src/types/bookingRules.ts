// Mirrors GET /api/booking-rules. All times are in `timeZone` (the salon's), not the visitor's.
export interface BookingRules {
  timeZone: string;
  openingTime: string; // HH:mm
  closingTime: string; // HH:mm, last slot starts before this
  slotIntervalMinutes: number;
  maxAdvanceDays: number;
}
