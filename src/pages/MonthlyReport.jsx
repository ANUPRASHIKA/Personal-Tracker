import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { addMonthsFn, parseDateStr, startOfWeek, endOfWeek, toDateStr, monthKeyOf, monthLabel, weekLabel } from '../lib/dates';
import {
  sumNetHours, completedShiftsCount, holidaySet, rangeWorkdayInfo, targetLabel, weeklyStatus,
} from '../lib/shift';
import { sumFare } from '../lib/commute';
import { LEAVE_TYPES } from '../lib/leave';
import { downloadCsv, SHIFT_CSV_COLUMNS, COMMUTE_CSV_COLUMNS, LEAVE_CSV_COLUMNS, WFH_CSV_COLUMNS } from '../lib/csv';
import { useToast } from '../context/ToastContext';

export default function MonthlyReport() {
  const { shifts, commutes, holidays, leaves, wfhLogs } = useData();
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

    const monthLeaves = leaves.filter(l => l.date.slice(0, 7) === key).sort((a, b) => a.date.localeCompare(b.date));
    const monthWfh = wfhLogs.filter(w => w.date.slice(0, 7) === key).sort((a, b) => a.date.localeCompare(b.date));
    const leaveDaysTotal = monthLeaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);

    const lWeekMap = new Map();
    monthLeaves.forEach(l => {
      const wk = toDateStr(startOfWeek(parseDateStr(l.date)));
      if (!lWeekMap.has(wk)) lWeekMap.set(wk, []);
      lWeekMap.get(wk).push(l);
    });
    const leaveWeekRows = [...lWeekMap.keys()].sort().map(wk => {
      const start = parseDateStr(wk), end = endOfWeek(start);
      const list = lWeekMap.get(wk);
      return { label: weekLabel(start, end), days: list.reduce((sum, l) => sum + (Number(l.days) || 0), 0) };
    });

    const wWeekMap = new Map();
    monthWfh.forEach(w => {
      const wk = toDateStr(startOfWeek(parseDateStr(w.date)));
      if (!wWeekMap.has(wk)) wWeekMap.set(wk, []);
      wWeekMap.get(wk).push(w);
    });
    const wfhWeekRows = [...wWeekMap.keys()].sort().map(wk => {
      const start = parseDateStr(wk), end = endOfWeek(start);
      return { label: weekLabel(start, end), count: wWeekMap.get(wk).length };
    });

    return {
      monthShifts, totalHours, avgPerWeek, avgWorkdaysPerWeek, hasData, status, totalHolidayHits, weekRows,
      monthCommutes, commuteWeekRows,
      monthLeaves, monthWfh, leaveDaysTotal, leaveWeekRows, wfhWeekRows,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, commutes, holidays, leaves, wfhLogs, key]);

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
          <button className="btn btn-secondary" onClick={() => { if (!downloadCsv(data.monthLeaves, LEAVE_CSV_COLUMNS, 'leave-monthly.csv')) showToast('Nothing to export'); }}>Export Leave CSV</button>
          <button className="btn btn-secondary" onClick={() => { if (!downloadCsv(data.monthWfh, WFH_CSV_COLUMNS, 'wfh-monthly.csv')) showToast('Nothing to export'); }}>Export WFH CSV</button>
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

      <div className="grid-2col">
        <div className="card report-card report-card--leave">
          <h3>Leave Summary (by week)</h3>
          <div className="summary-line">
            <span>Total Days: <strong className="stat-accent-purple">{data.leaveDaysTotal.toFixed(2)}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Week</th><th>Days</th></tr></thead>
              <tbody>
                {data.leaveWeekRows.length ? data.leaveWeekRows.map(w => (
                  <tr key={w.label}><td>{w.label}</td><td>{w.days.toFixed(2)}</td></tr>
                )) : <tr><td colSpan={2} className="muted">No entries this month</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Days</th><th>Notes</th></tr></thead>
              <tbody>
                {data.monthLeaves.length ? data.monthLeaves.map(l => (
                  <tr key={l.id}>
                    <td>{l.date}</td><td>{LEAVE_TYPES[l.type] || l.type}</td><td>{l.days}</td><td>{l.notes}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="muted">No entries this month</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card report-card report-card--wfh">
          <h3>WFH Summary (by week)</h3>
          <div className="summary-line">
            <span>Total Days: <strong className="stat-accent-teal">{data.monthWfh.length}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Week</th><th>Days</th></tr></thead>
              <tbody>
                {data.wfhWeekRows.length ? data.wfhWeekRows.map(w => (
                  <tr key={w.label}><td>{w.label}</td><td>{w.count}</td></tr>
                )) : <tr><td colSpan={2} className="muted">No entries this month</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {data.monthWfh.length ? data.monthWfh.map(w => (
                  <tr key={w.id}><td>{w.date}</td><td>{w.notes}</td></tr>
                )) : <tr><td colSpan={2} className="muted">No entries this month</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
