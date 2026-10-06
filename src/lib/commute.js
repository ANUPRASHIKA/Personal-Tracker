import { toDateStr } from './dates';

export const ROUTE_LABELS = { 'home-office': 'Home → Office', 'office-home': 'Office → Home', other: 'Other' };
export const MODE_LABELS = { auto: 'Auto', metro: 'Metro', other: 'Other' };
export const PAYMENT_LABELS = { gpay: 'GPay', cash: 'Cash', card: 'Card', other: 'Other' };
export const FARE_DEFAULTS = { morning: 420, evening: 400 };
export const ROUTE_DEFAULTS = { morning: 'home-office', evening: 'office-home' };

// Non-commute entry types: flat amounts not tied to a morning/evening period.
export const FLAT_EXPENSE_LABELS = { other: 'Other Expense', 'amazon-mine': 'My Amazon Expenses', 'amazon-parents': 'Parents Expense' };

// Deterministic color dot per category label, purely for a bit of visual variety in report tables.
export const CATEGORY_DOT_COLORS = {
  Auto: '#4f8cff', Metro: '#c084fc', Other: '#2dd4bf',
  'Other Expense': '#f59e0b', 'My Amazon Expenses': '#ef4444', 'Parents Expense': '#22c55e',
};

// Every category label that can appear in a totals-by-category breakdown, in display order.
export const ALL_CATEGORY_LABELS = [...Object.values(MODE_LABELS), ...Object.values(FLAT_EXPENSE_LABELS)].filter((v, i, a) => a.indexOf(v) === i);

export function routeText(c) { return c.route === 'other' ? (c.routeRemark || 'Other') : ROUTE_LABELS[c.route]; }
export function modeText(c) { return c.mode === 'other' ? (c.modeRemark || 'Other') : MODE_LABELS[c.mode]; }
export function paymentText(c) { return c.payment === 'other' ? (c.paymentRemark || 'Other') : PAYMENT_LABELS[c.payment]; }
export function isOtherExpense(c) { return c.type !== 'commute'; }
// The label used to categorize an entry in mode/category breakdown tables.
export function categoryText(c) { return isOtherExpense(c) ? (FLAT_EXPENSE_LABELS[c.type] || 'Other Expense') : modeText(c); }

export function sumFare(list) { return list.reduce((sum, c) => sum + (Number(c.fare) || 0), 0); }

export function commutesInRange(list, startDate, endDate) {
  const s = toDateStr(startDate), e = toDateStr(endDate);
  return list.filter(x => x.date >= s && x.date <= e).sort((a, b) => a.date.localeCompare(b.date));
}

// Clubs morning + evening commute entries for the same date into one group; flat expenses
// (parking, tolls, Amazon orders, etc.) aren't tied to a period, so any number of them are collected in a list.
export function groupCommutesByDate(list) {
  const map = new Map();
  list.forEach(c => {
    if (!map.has(c.date)) map.set(c.date, { date: c.date, morning: null, evening: null, other: [] });
    const g = map.get(c.date);
    if (isOtherExpense(c)) g.other.push(c); else g[c.period] = c;
  });
  return [...map.values()].map(g => ({
    ...g,
    total: (g.morning ? Number(g.morning.fare) || 0 : 0) + (g.evening ? Number(g.evening.fare) || 0 : 0) + sumFare(g.other),
  }));
}

// Totals per category label (Auto, Metro, Other Expense, My Amazon Expenses, etc.) across a list of entries.
export function totalsByCategory(list) {
  const totals = {};
  list.forEach(c => { const key = categoryText(c); totals[key] = (totals[key] || 0) + (Number(c.fare) || 0); });
  return totals;
}

// Collapse duplicate shift entries for the same date, keeping the one with a punch-out
// recorded (most complete); ties go to the most recently saved entry. Returns the deduped list.
export function dedupeShifts(shifts) {
  const byDate = new Map();
  shifts.forEach(s => {
    const prev = byDate.get(s.date);
    if (!prev || s.punchOut || !prev.punchOut) byDate.set(s.date, s);
  });
  return [...byDate.values()];
}

// Collapse duplicate commute entries for the same date + period, keeping the most recently saved one.
// Flat expenses aren't period-bound, so several per date are legitimate and never collapsed together.
export function dedupeCommutes(commutes) {
  const byKey = new Map();
  commutes.forEach(c => byKey.set(isOtherExpense(c) ? 'other|' + c.id : c.date + '|' + c.period, c));
  return [...byKey.values()];
}
