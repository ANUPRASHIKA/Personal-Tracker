import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { addMonthsFn, parseDateStr, startOfWeek, endOfWeek, toDateStr, monthKeyOf, monthLabel, weekLabel } from '../lib/dates';
import {
  sumNetHours, completedShiftsCount, holidaySet, rangeWorkdayInfo, targetLabel, weeklyStatus,
} from '../lib/shift';
import { sumFare } from '../lib/commute';
import { downloadCsv, SHIFT_CSV_COLUMNS, COMMUTE_CSV_COLUMNS } from '../lib/csv';
import { useToast } from '../context/ToastContext';

export default function MonthlyReport() {
  const { shifts, commutes, holidays } = useData();
  const showToast = useToast();
  const [anchor, setAnchor] = useState(new Date());

  const key = monthKeyOf(anchor);

  const data = useMemo(() => {
    const monthShifts = shifts.filter(s => s.date.slice(0, 7) === key);
    const totalHours = sumNetHours(monthShifts);

    const weekMap = new Map();
    monthShifts.forEach(s => {
      const wk = toDateStr(startOfWeek(parseDateStr(s.date)));
      if (!weekMap.has(wk)) weekMap.set(wk, []);
      weekMap.get(wk).push(s);
    });
    const weekKeys = [...weekMap.keys()].sort();
    const hset = holidaySet(holidays);
    const weekInfos = weekKeys.map(wk => {
      const start = parseDateStr(wk), end = endOfWeek(start);
      return rangeWorkdayInfo(start, end, hset);
    });
    const totalWorkdays = weekInfos.reduce((sum, i) => sum + i.workdays, 0);
    const totalHolidayHits = weekInfos.reduce((sum, i) => sum + i.holidayHits, 0);
    const avgWorkdaysPerWeek = weekKeys.length ? totalWorkdays / weekKeys.length : 5;
    const avgPerWeek = weekKeys.length ? totalHours / weekKeys.length : 0;
    const hasData = completedShiftsCount(monthShifts) > 0;
    const status = weeklyStatus(avgPerWeek, avgWorkdaysPerWeek);

    const weekRows = weekKeys.map((wk, i) => {
      const start = parseDateStr(wk), end = endOfWeek(start);
      const list = weekMap.get(wk);
      const total = sumNetHours(list);
      const info = weekInfos[i];
      return { label: weekLabel(start, end), total, holidayHits: info.holidayHits, status: weeklyStatus(total, info.workdays) };
    });

    const monthCommutes = commutes.filter(c => c.date.slice(0, 7) === key);
    const cWeekMap = new Map();
    monthCommutes.forEach(c => {
      const wk = toDateStr(startOfWeek(parseDateStr(c.date)));
      if (!cWeekMap.has(wk)) cWeekMap.set(wk, []);
      cWeekMap.get(wk).push(c);
    });
    const cWeekKeys = [...cWeekMap.keys()].sort();
    const commuteWeekRows = cWeekKeys.map(wk => {
      const start = parseDateStr(wk), end = endOfWeek(start);
      const list = cWeekMap.get(wk);
      return { label: weekLabel(start, end), count: list.length, total: sumFare(list) };
    });

    return {
      monthShifts, totalHours, avgPerWeek, avgWorkdaysPerWeek, hasData, status, totalHolidayHits, weekRows,
      monthCommutes, commuteWeekRows,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, commutes, holidays, key]);

  return (
    <div>
      <div className="card">
        <div className="report-controls">
          <button className="btn btn-secondary" onClick={() => setAnchor(addMonthsFn(anchor, -1))}>‹ Prev</button>
          <span className="report-label">{monthLabel(anchor)}</span>
          <button className="btn btn-secondary" onClick={() => setAnchor(addMonthsFn(anchor, 1))}>Next ›</button>
          <input type="date" title="Jump to date" value={toDateStr(anchor)} onChange={ev => ev.target.value && setAnchor(parseDateStr(ev.target.value))} />
          <button className="btn btn-secondary" onClick={() => { if (!downloadCsv(data.monthShifts, SHIFT_CSV_COLUMNS, 'shift-monthly.csv')) showToast('Nothing to export'); }}>Export Shift CSV</button>
          <button className="btn btn-secondary" onClick={() => { if (!downloadCsv(data.monthCommutes, COMMUTE_CSV_COLUMNS, 'commute-monthly.csv')) showToast('Nothing to export'); }}>Export Commute CSV</button>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card report-card">
          <h3>Shift Summary (by week)</h3>
          <div className="summary-line">
            <span>Total Hours: <strong className="stat-accent-blue">{data.totalHours.toFixed(1)}</strong></span>
            <span>Avg / Week: <strong className="stat-accent-blue">{data.avgPerWeek.toFixed(1)}</strong></span>
            <span className={`badge ${data.hasData ? data.status.cls : 'badge-neutral'}`}>{data.hasData ? data.status.label : 'No data'}</span>
            {data.hasData && <span className="muted">{targetLabel(data.avgWorkdaysPerWeek, data.totalHolidayHits)}</span>}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Week</th><th>Total Hrs</th><th>Holidays</th><th>Status</th></tr></thead>
              <tbody>
                {data.weekRows.length ? data.weekRows.map(w => (
                  <tr key={w.label}>
                    <td>{w.label}</td><td>{w.total.toFixed(1)}h</td><td>{w.holidayHits || '–'}</td>
                    <td><span className={`badge ${w.status.cls}`}>{w.status.label}</span></td>
                  </tr>
                )) : <tr><td colSpan={4} className="muted">No entries this month</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card report-card report-card--commute">
          <h3>Commute Summary (by week)</h3>
          <div className="summary-line">
            <span>Total Spend: <strong className="stat-accent-green">₹{sumFare(data.monthCommutes)}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Week</th><th>Trips</th><th>Total ₹</th></tr></thead>
              <tbody>
                {data.commuteWeekRows.length ? data.commuteWeekRows.map(w => (
                  <tr key={w.label}><td>{w.label}</td><td>{w.count}</td><td>₹{w.total}</td></tr>
                )) : <tr><td colSpan={3} className="muted">No entries this month</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
