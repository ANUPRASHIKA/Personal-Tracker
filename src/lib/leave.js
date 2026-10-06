import { monthKeyOf, parseDateStr, toDateStr } from './dates';

export const LEAVE_TYPES = {
  sick: 'Sick',
  casual: 'Casual',
  annual: 'Annual',
  tenure: 'Tenure',
  wellness: 'Wellness',
};

// Org policy constants.
export const MONTHLY_ACCRUAL = { sick: 1, casual: 1, annual: 1.75, wellness: 1 };
export const TENURE_LEAVE_PER_YEAR = 1;
export const ANNUAL_CARRY_FORWARD_CAP = 45;
export const WFH_ANNUAL_CAP = 26;
export const WFH_MONTHLY_WARN_THRESHOLD = 2;
export const LEAVES_MONTHLY_WARN_THRESHOLD = 5;

export function defaultLeaveSettings() {
  return {
    tenureEligible: true,
    annualOpeningBalance: 0,
    annualOpeningDate: `${new Date().getFullYear()}-01-01`,
  };
}

function isLastDayOfMonth(d) { return d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

// Sick/Casual are credited on the 1st, so by any day in month M, Jan..M have already landed.
function monthsCreditedAtStart(asOf) { return asOf.getMonth() + 1; }

// Counts month-end credit events (e.g. the 1.75/month annual accrual) strictly after `from`, up to `to`.
function monthEndCreditsBetween(from, to) {
  let count = 0;
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (true) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    if (monthEnd <= from) { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); continue; }
    if (monthEnd > to) break;
    count++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return count;
}

function usedInYear(leaves, type, year) {
  return leaves.filter(l => l.type === type && l.date.slice(0, 4) === String(year)).reduce((s, l) => s + (Number(l.days) || 0), 0);
}

function usedInMonth(leaves, type, monthKey) {
  return leaves.filter(l => l.type === type && l.date.slice(0, 7) === monthKey).reduce((s, l) => s + (Number(l.days) || 0), 0);
}

// Computes current available balance per leave type, as of `asOf` (defaults to today).
// Sick/Casual/Tenure reset every calendar year (no carry-forward); Annual carries forward
// (capped) from a user-set opening balance/date; Wellness resets every month.
export function computeLeaveBalances(leaves, settings, asOf = new Date()) {
  const year = asOf.getFullYear();
  const monthKey = monthKeyOf(asOf);
  const startCredits = monthsCreditedAtStart(asOf);

  const sickAccrued = startCredits * MONTHLY_ACCRUAL.sick;
  const casualAccrued = startCredits * MONTHLY_ACCRUAL.casual;
  const tenureAccrued = settings.tenureEligible ? TENURE_LEAVE_PER_YEAR : 0;

  const anchorDate = parseDateStr(settings.annualOpeningDate || defaultLeaveSettings().annualOpeningDate);
  const annualAccruedSinceAnchor = monthEndCreditsBetween(anchorDate, asOf) * MONTHLY_ACCRUAL.annual;
  const annualUsedSinceAnchor = leaves
    .filter(l => l.type === 'annual' && l.date > toDateStr(anchorDate))
    .reduce((s, l) => s + (Number(l.days) || 0), 0);
  const annualActual = Math.max(0, (Number(settings.annualOpeningBalance) || 0) + annualAccruedSinceAnchor - annualUsedSinceAnchor);
  const annualBalance = Math.min(ANNUAL_CARRY_FORWARD_CAP, annualActual);

  const wellnessUsedThisMonth = usedInMonth(leaves, 'wellness', monthKey);

  return {
    sick: Math.max(0, sickAccrued - usedInYear(leaves, 'sick', year)),
    casual: Math.max(0, casualAccrued - usedInYear(leaves, 'casual', year)),
    tenure: Math.max(0, tenureAccrued - usedInYear(leaves, 'tenure', year)),
    annual: annualBalance,
    annualActual,
    wellness: Math.max(0, MONTHLY_ACCRUAL.wellness - wellnessUsedThisMonth),
  };
}

export function wfhUsage(wfhLogs, asOf = new Date()) {
  const year = asOf.getFullYear();
  const monthKey = monthKeyOf(asOf);
  const usedThisYear = wfhLogs.filter(w => w.date.slice(0, 4) === String(year)).length;
  const usedThisMonth = wfhLogs.filter(w => w.date.slice(0, 7) === monthKey).length;
  return { usedThisYear, usedThisMonth, remaining: Math.max(0, WFH_ANNUAL_CAP - usedThisYear) };
}

// Returns warning strings for the given month (defaults to the current month).
export function monthlyWarnings(leaves, wfhLogs, asOf = new Date()) {
  const monthKey = monthKeyOf(asOf);
  const leaveDaysThisMonth = leaves.filter(l => l.date.slice(0, 7) === monthKey).reduce((s, l) => s + (Number(l.days) || 0), 0);
  const wfhThisMonth = wfhLogs.filter(w => w.date.slice(0, 7) === monthKey).length;
  const warnings = [];
  if (wfhThisMonth > WFH_MONTHLY_WARN_THRESHOLD) {
    warnings.push(`⚠ WFH days this month: ${wfhThisMonth} (guideline is ${WFH_MONTHLY_WARN_THRESHOLD}/month)`);
  }
  if (leaveDaysThisMonth > LEAVES_MONTHLY_WARN_THRESHOLD) {
    warnings.push(`⚠ Leave days this month: ${leaveDaysThisMonth} (guideline is ${LEAVES_MONTHLY_WARN_THRESHOLD}/month)`);
  }
  return warnings;
}

// Last `count` months (oldest first) as { monthKey, label } pairs, for trend charts.
export function lastMonths(count, asOf = new Date()) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(asOf.getFullYear(), asOf.getMonth() - i, 1);
    out.push({ monthKey: monthKeyOf(d), label: d.toLocaleString('en-US', { month: 'short' }) });
  }
  return out;
}

// Collapse duplicate leave entries for the same date + type, keeping the most recently saved one.
export function dedupeLeaves(leaves) {
  const byKey = new Map();
  leaves.forEach(l => byKey.set(l.date + '|' + l.type, l));
  return [...byKey.values()];
}

// Collapse duplicate WFH entries for the same date, keeping the most recently saved one.
export function dedupeWfh(wfhLogs) {
  const byDate = new Map();
  wfhLogs.forEach(w => byDate.set(w.date, w));
  return [...byDate.values()];
}

// Days availed per leave type so far this calendar year, keyed by LEAVE_TYPES key.
export function leaveUsageByType(leaves, asOf = new Date()) {
  const year = asOf.getFullYear();
  const out = {};
  Object.keys(LEAVE_TYPES).forEach(type => { out[type] = usedInYear(leaves, type, year); });
  return out;
}
