import { addDays, toDateStr, timeToMinutes } from './dates';

export { minutesToHoursLabel } from './dates';

// Returns net minutes worked, or null if punch-out not yet recorded.
export function computeNetMinutes(shift) {
  const start = timeToMinutes(shift.punchIn);
  const end = timeToMinutes(shift.punchOut);
  if (start == null || end == null) return null;
  let worked = end - start;
  if (worked < 0) worked += 24 * 60; // overnight guard
  const brk = Number(shift.breakMin) || 0;
  const calls = Number(shift.callMin) || 0;
  return worked - brk + calls;
}

export function shiftsInRange(list, startDate, endDate) {
  const s = toDateStr(startDate), e = toDateStr(endDate);
  return list.filter(x => x.date >= s && x.date <= e).sort((a, b) => a.date.localeCompare(b.date));
}

export function sumNetHours(list) {
  return list.reduce((sum, s) => {
    const m = computeNetMinutes(s);
    return sum + (m == null ? 0 : m / 60);
  }, 0);
}

// Only count days that have both punch-in and punch-out when deciding if a status badge should show.
export function completedShiftsCount(list) { return list.filter(s => computeNetMinutes(s) != null).length; }

// A working day targets 7.2-8h net (36-40h over a 5-day week); holidays reduce the expected workdays.
export function holidaySet(holidays) { return new Set(holidays.map(h => h.date)); }
export function isWeekday(d) { const dow = d.getDay(); return dow >= 1 && dow <= 5; }

// Counts Mon-Fri days in [start, end] (inclusive), split into working days vs. days marked as holidays.
export function rangeWorkdayInfo(start, end, hset) {
  let workdays = 0, holidayHits = 0;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    if (!isWeekday(d)) continue;
    if (hset.has(toDateStr(d))) holidayHits++; else workdays++;
  }
  return { workdays, holidayHits };
}

export function workdayBand(workdays) {
  return { low: workdays * 7.2, high: workdays * 8 };
}

export function targetLabel(workdays, holidayHits) {
  const { low, high } = workdayBand(workdays);
  const base = `Target ${low.toFixed(1)}–${high.toFixed(1)}h`;
  return holidayHits > 0 ? `${base} (${holidayHits} holiday${holidayHits > 1 ? 's' : ''} excluded)` : base;
}

// Status vs. the workday-adjusted target band (default 36-40h for a full 5-day week).
export function weeklyStatus(totalHours, workdays) {
  if (workdays <= 0) return { cls: 'badge-neutral', label: `Holiday period (${totalHours.toFixed(1)}h)` };
  const { low, high } = workdayBand(workdays);
  if (totalHours < low) return { cls: 'badge-warn', label: `Under (${totalHours.toFixed(1)}h)` };
  if (totalHours > high) return { cls: 'badge-warn', label: `Over (${totalHours.toFixed(1)}h)` };
  return { cls: 'badge-good', label: `On Track (${totalHours.toFixed(1)}h)` };
}
