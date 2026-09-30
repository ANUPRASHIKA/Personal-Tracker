import { computeNetMinutes } from './shift';
import { isOtherExpense, routeText, modeText, paymentText } from './commute';

export const SHIFT_CSV_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'punchIn', label: 'Punch In' },
  { key: 'punchOut', label: 'Punch Out' },
  { key: 'breakMin', label: 'Break (min)' },
  { key: 'callMin', label: 'After-hours Call (min)' },
  { key: r => { const m = computeNetMinutes(r); return m == null ? '' : (m / 60).toFixed(2); }, label: 'Net Hours' },
  { key: 'notes', label: 'Notes' },
];

export const COMMUTE_CSV_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: r => isOtherExpense(r) ? 'Other Expense' : 'Commute', label: 'Type' },
  { key: 'period', label: 'Period' },
  { key: r => isOtherExpense(r) ? '' : routeText(r), label: 'Route' },
  { key: r => isOtherExpense(r) ? '' : modeText(r), label: 'Mode' },
  { key: r => paymentText(r), label: 'Payment' },
  { key: 'fare', label: 'Fare / Amount' },
  { key: 'notes', label: 'Notes' },
];

function csvEscape(val) {
  const s = String(val == null ? '' : val);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function buildCsv(rows, columns) {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const lines = rows.map(r => columns.map(c => csvEscape(typeof c.key === 'function' ? c.key(r) : r[c.key])).join(','));
  return [header, ...lines].join('\n');
}

export function downloadCsv(rows, columns, filename) {
  if (!rows.length) return false;
  const csv = buildCsv(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
