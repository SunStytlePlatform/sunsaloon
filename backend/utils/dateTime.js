export function getCurrentDateTime() {
  const now = new Date();
  return { readable: now.toLocaleString(), iso: now.toISOString() };
}
