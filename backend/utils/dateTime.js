export function getCurrentDateTime() {
  const now = new Date();
  return { readable: now.toLocaleString(), iso: now.toISOString() };
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

// True for a real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-30).
export function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// True for a 24h time in HH:MM or HH:MM:SS form.
export function isValidTimeString(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

// Postgres TIME comes back as HH:MM:SS; the API works in HH:MM.
export function toHHMM(time) {
  return typeof time === 'string' ? time.slice(0, 5) : time;
}

export function getNowInTimeZone(timeZone, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// `now` is { date: 'YYYY-MM-DD', time: 'HH:MM' } in the salon's time zone.
export function isInPast(date, time, now) {
  if (date !== now.date) return date < now.date;
  return toHHMM(time) <= now.time;
}
