import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import CategoryDot from '../components/CategoryDot';
import { addDays, parseDateStr, startOfWeek, endOfWeek, toDateStr, weekLabel } from '../lib/dates';
import {
  computeNetMinutes, minutesToHoursLabel, shiftsInRange, sumNetHours, completedShiftsCount,
  holidaySet, rangeWorkdayInfo, targetLabel, weeklyStatus,
} from '../lib/shift';
import { commutesInRange, sumFare, categoryText, groupCommutesByDate, modeText } from '../lib/commute';
import { LEAVE_TYPES } from '../lib/leave';
import { downloadCsv, SHIFT_CSV_COLUMNS, COMMUTE_CSV_COLUMNS, LEAVE_CSV_COLUMNS, WFH_CSV_COLUMNS } from '../lib/csv';
import { useToast } from '../context/ToastContext';

export default function WeeklyReport() {
  const { shifts, commutes, holidays, leaves, wfhLogs } = useData();
  const showToast = useToast();
  const [anchor, setAnchor] = useState(new Date());

  const s = startOfWeek(anchor), e = endOfWeek(anchor);

  const data = useMemo(() => {
    const weekShifts = shiftsInRange(shifts, s, e);
    const totalHours = sumNetHours(weekShifts);
    const daysWithData = completedShiftsCount(weekShifts);
    const wkInfo = rangeWorkdayInfo(s, e, holidaySet(holidays));
    const status = weeklyStatus(totalHours, wkInfo.workdays);

    const weekCommutes = commutesInRange(commutes, s, e);
    const byCategory = {};
    weekCommutes.forEach(c => {
      const key = categoryText(c);
      byCategory[key] = byCategory[key] || { count: 0, total: 0 };
      byCategory[key].count++;
      byCategory[key].total += Number(c.fare) || 0;
    });

    const sStr = toDateStr(s), eStr = toDateStr(e);
    const weekLeaves = leaves.filter(l => l.date >= sStr && l.date <= eStr).sort((a, b) => a.date.localeCompare(b.date));
    const weekWfh = wfhLogs.filter(w => w.date >= sStr && w.date <= eStr).sort((a, b) => a.date.localeCompare(b.date));
    const leaveDaysTotal = weekLeaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);

    return {
      weekShifts, totalHours, daysWithData, wkInfo, status,
      weekCommutes, byCategory,
      commuteGroups: groupCommutesByDate(weekCommutes).sort((a, b) => a.date.localeCompare(b.date)),
      weekLeaves, weekWfh, leaveDaysTotal,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, commutes, holidays, leaves, wfhLogs, toDateStr(s), toDateStr(e)]);

  return (
    <div>
      <div className="card">
        <div className="report-controls">
          <button className="btn btn-secondary" onClick={() => setAnchor(addDays(anchor, -7))}>‹ Prev</button>
          <span className="report-label">{weekLabel(s, e)}</span>
          <button className="btn btn-secondary" onClick={() => setAnchor(addDays(anchor, 7))}>Next ›</button>
          <input type="date" title="Jump to date" value={toDateStr(anchor)} onChange={ev => ev.target.value && setAnchor(parseDateStr(ev.target.value))} />
          <button className="btn btn-secondary" onClick={() => { if (!downloadCsv(data.weekShifts, SHIFT_CSV_COLUMNS, 'shift-weekly.csv')) showToast('Nothing to export'); }}>Export Shift CSV</button>
          <button className="btn btn-secondary" onClick={() => { if (!downloadCsv(data.weekCommutes, COMMUTE_CSV_COLUMNS, 'commute-weekly.csv')) showToast('Nothing to export'); }}>Export Commute CSV</button>
          <button className="btn btn-secondary" onClick={() => { if (!downloadCsv(data.weekLeaves, LEAVE_CSV_COLUMNS, 'leave-weekly.csv')) showToast('Nothing to export'); }}>Export Leave CSV</button>
          <button className="btn btn-secondary" onClick={() => { if (!downloadCsv(data.weekWfh, WFH_CSV_COLUMNS, 'wfh-weekly.csv')) showToast('Nothing to export'); }}>Export WFH CSV</button>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card report-card">
          <h3>Shift Summary</h3>
          <div className="summary-line">
            <span>Total Hours: <strong className="stat-accent-blue">{data.totalHours.toFixed(1)}</strong></span>
            <span>Avg / Day: <strong className="stat-accent-blue">{(data.daysWithData ? data.totalHours / data.daysWithData : 0).toFixed(1)}</strong></span>
            <span className={`badge ${data.daysWithData ? data.status.cls : 'badge-neutral'}`}>{data.daysWithData ? data.status.label : 'No data'}</span>
            <span className="muted">{targetLabel(data.wkInfo.workdays, data.wkInfo.holidayHits)}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Net Hrs</th></tr></thead>
              <tbody>
                {data.weekShifts.length ? data.weekShifts.map(sh => (
                  <tr key={sh.id}>
                    <td>{sh.date}</td><td>{sh.punchIn || '–'}</td><td>{sh.punchOut || 'In progress'}</td>
                    <td>{minutesToHoursLabel(computeNetMinutes(sh))}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="muted">No entries this week</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card report-card report-card--commute">
          <h3>Commute Summary</h3>
          <div className="summary-line">
            <span>Total Spend: <strong className="stat-accent-green">₹{sumFare(data.weekCommutes)}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Count</th><th>Total ₹</th></tr></thead>
              <tbody>
                {Object.keys(data.byCategory).length ? Object.entries(data.byCategory).map(([label, v]) => (
                  <tr key={label}><td><CategoryDot label={label} /></td><td>{v.count}</td><td>₹{v.total}</td></tr>
                )) : <tr><td colSpan={3} className="muted">No entries this week</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Morning</th><th>Evening</th><th>Other</th><th>Total ₹</th></tr></thead>
              <tbody>
                {data.commuteGroups.length ? data.commuteGroups.map(g => (
                  <tr key={g.date}>
                    <td>{g.date}</td>
                    <td>{g.morning ? `${modeText(g.morning)} · ₹${g.morning.fare}` : '–'}</td>
                    <td>{g.evening ? `${modeText(g.evening)} · ₹${g.evening.fare}` : '–'}</td>
                    <td>{g.other.length ? g.other.map(o => `${o.notes || 'Other'} · ₹${o.fare}`).join(', ') : '–'}</td>
                    <td>₹{g.total}</td>
                  </tr>
                )) : <tr><td colSpan={5} className="muted">No entries this week</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card report-card report-card--leave">
          <h3>Leave Summary</h3>
          <div className="summary-line">
            <span>Total Days: <strong className="stat-accent-purple">{data.leaveDaysTotal.toFixed(2)}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Days</th><th>Notes</th></tr></thead>
              <tbody>
                {data.weekLeaves.length ? data.weekLeaves.map(l => (
                  <tr key={l.id}>
                    <td>{l.date}</td><td>{LEAVE_TYPES[l.type] || l.type}</td><td>{l.days}</td><td>{l.notes}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="muted">No entries this week</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card report-card report-card--wfh">
          <h3>WFH Summary</h3>
          <div className="summary-line">
            <span>Total Days: <strong className="stat-accent-teal">{data.weekWfh.length}</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {data.weekWfh.length ? data.weekWfh.map(w => (
                  <tr key={w.id}><td>{w.date}</td><td>{w.notes}</td></tr>
                )) : <tr><td colSpan={2} className="muted">No entries this week</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
