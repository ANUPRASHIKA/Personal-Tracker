export function pad2(n) { return String(n).padStart(2, '0'); }

export function toDateStr(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

export function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr() { return toDateStr(new Date()); }

export function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
export function addMonthsFn(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }

// Monday-based week start
export function startOfWeek(d) {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7; // Mon=0 ... Sun=6
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}
export function endOfWeek(d) { return addDays(startOfWeek(d), 6); }

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatDisplayDate(d) {
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}
export function weekLabel(start, end) {
  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
}
export function monthLabel(d) { return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`; }
export function monthKeyOf(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }

export function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHoursLabel(mins) {
  if (mins == null) return '–';
  const sign = mins < 0 ? '-' : '';
  mins = Math.abs(mins);
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${sign}${h}h ${pad2(m)}m`;
}
