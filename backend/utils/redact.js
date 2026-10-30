// Keeps customer contact details out of log files: emails and phone numbers are masked wherever they appear in a
// message or in logged metadata (Supabase error details, for example, quote the offending phone number).
const EMAIL_RE = /[^\s@"'<>(),;]+@[^\s@"'<>(),;]+\.[^\s@"'<>(),;]+/g;
// Phone numbers are normalised to 7-15 contiguous digits (optional +) before they reach the logs.
const PHONE_RE = /(?<![\w.])\+?\d{7,15}(?![\w.])/g;

export function redactText(text) {
  return String(text)
    .replace(EMAIL_RE, '[email]')
    .replace(PHONE_RE, (match) => `***${match.slice(-2)}`);
}

export function redactValue(value, depth = 0) {
  if (typeof value === 'string') return redactText(value);
  if (value instanceof Error) {
    const copy = new Error(redactText(value.message));
    copy.name = value.name;
    copy.stack = redactText(value.stack ?? value.message);
    return copy;
  }
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item, depth + 1)]));
}
