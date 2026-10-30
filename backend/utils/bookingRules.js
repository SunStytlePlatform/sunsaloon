// Pure slot rules so they can be unit-tested without Express or the database.
// `now` is { date, time } in the salon's time zone; `rules` is env.bookingRules.

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const daysBetween = (fromDate, toDate) => {
  const parse = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(toDate) - parse(fromDate)) / 86_400_000);
};

const pad = (n) => String(n).padStart(2, '0');
const toClock = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// Returns null when the slot is allowed, otherwise { code, field, message } describing the first broken rule.
export function checkBookingRules(date, time, now, rules) {
  if (daysBetween(now.date, date) > rules.maxAdvanceDays) {
    return {
      code: 'TOO_FAR_AHEAD',
      field: 'appointment_date',
      message: `Appointments can be requested at most ${rules.maxAdvanceDays} days ahead`,
    };
  }

  const slot = toMinutes(time);
  const open = toMinutes(rules.openingTime);
  const close = toMinutes(rules.closingTime);
  if (slot < open || slot >= close) {
    return {
      code: 'OUTSIDE_OPENING_HOURS',
      field: 'appointment_time',
      message: `The salon is open from ${rules.openingTime} to ${rules.closingTime}`,
    };
  }
  if ((slot - open) % rules.slotIntervalMinutes !== 0) {
    return {
      code: 'INVALID_SLOT',
      field: 'appointment_time',
      message: `Please choose a time on a ${rules.slotIntervalMinutes}-minute boundary (for example ${toClock(open + rules.slotIntervalMinutes)})`,
    };
  }
  return null;
}
