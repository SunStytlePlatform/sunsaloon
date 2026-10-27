export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

// Mirrors the appointments_status_check constraint in the database.
export const APPOINTMENT_STATUSES = Object.freeze(Object.values(APPOINTMENT_STATUS));

// Phase 1: the admin can only accept or reject pending requests.
const ALLOWED_TRANSITIONS = Object.freeze({
  [APPOINTMENT_STATUS.PENDING]: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.REJECTED],
});

export function allowedNextStatuses(from) {
  return Object.hasOwn(ALLOWED_TRANSITIONS, from) ? ALLOWED_TRANSITIONS[from] : [];
}

export function canTransition(from, to) {
  return allowedNextStatuses(from).includes(to);
}
