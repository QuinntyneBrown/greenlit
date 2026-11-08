const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Fri 20 Nov 2026" for a `yyyy-MM-dd` date, read as a calendar date (no time zone). */
export function closureDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[weekday]} ${d} ${MONTHS[m - 1]} ${y}`;
}

/** One day, or "Mon 21 Dec 2026 – Fri 1 Jan 2027" for a run (pages/settings/school-calendar). */
export function closureDates(first: string, last: string): string {
  return first === last ? closureDate(first) : `${closureDate(first)} – ${closureDate(last)}`;
}
