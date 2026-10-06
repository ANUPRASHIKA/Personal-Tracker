import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import BarChart from '../components/BarChart';
import QuickPunch from '../components/QuickPunch';
import {
  addDays, startOfWeek, endOfWeek, monthKeyOf, parseDateStr, toDateStr, todayStr, weekLabel,
} from '../lib/dates';
import {
  computeNetMinutes, minutesToHoursLabel, shiftsInRange, sumNetHours, completedShiftsCount,
  holidaySet, rangeWorkdayInfo, workdayBand, targetLabel, weeklyStatus,
} from '../lib/shift';
import {
  commutesInRange, sumFare, groupCommutesByDate, categoryText, modeText, CATEGORY_DOT_COLORS,
} from '../lib/commute';
import { wfhUsage, monthlyWarnings, LEAVE_TYPES, WFH_ANNUAL_CAP } from '../lib/leave';

export default function Dashboard() {
  const { shifts, commutes, holidays, leaves, wfhLogs } = useData();

  const stats = useMemo(() => {
    const today = new Date();
    const wkStart = startOfWeek(today), wkEnd = endOfWeek(today);
    const monthKey = monthKeyOf(today);
    const hset = holidaySet(holidays);

    const todayShift = shifts.find(s => s.date === todayStr());
    const todayMin = todayShift ? computeNetMinutes(todayShift) : null;

    const weekShifts = shiftsInRange(shifts, wkStart, wkEnd);
    const weekHours = sumNetHours(weekShifts);
    const weekHasData = completedShiftsCount(weekShifts) > 0;
    const wkInfo = rangeWorkdayInfo(wkStart, wkEnd, hset);
    const wStatus = weeklyStatus(weekHours, wkInfo.workdays);
    const wkBand = workdayBand(wkInfo.workdays);

    const monthShifts = shifts.filter(s => s.date.slice(0, 7) === monthKey);
    const weekKeysInMonth = [...new Set(monthShifts.map(s => toDateStr(startOfWeek(parseDateStr(s.date)))))];
    const monthTotalHours = sumNetHours(monthShifts);
    let monthWorkdays = 0, monthHolidayHits = 0;
    weekKeysInMonth.forEach(wk => {
      const start = parseDateStr(wk), end = endOfWeek(start);
      const info = rangeWorkdayInfo(start, end, hset);
      monthWorkdays += info.workdays;
      monthHolidayHits += info.holidayHits;
    });
    const avgWorkdaysPerWeek = weekKeysInMonth.length ? monthWorkdays / weekKeysInMonth.length : 5;
    const avgPerWeek = weekKeysInMonth.length ? monthTotalHours / weekKeysInMonth.length : 0;
    const monthHasData = completedShiftsCount(monthShifts) > 0;
    const mStatus = weeklyStatus(avgPerWeek, avgWorkdaysPerWeek);

    const weekCommutes = commutesInRange(commutes, wkStart, wkEnd);
    const monthCommutes = commutes.filter(c => c.date.slice(0, 7) === monthKey);

    const monthLeaves = leaves.filter(l => l.date.slice(0, 7) === monthKey);
    const monthLeaveDays = monthLeaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);
    const monthWfhCount = wfhLogs.filter(w => w.date.slice(0, 7) === monthKey).length;
    const wfh = wfhUsage(wfhLogs);
    const leaveWarnings = monthlyWarnings(leaves, wfhLogs);

    let bannerText = null;
    if (weekHasData && (weekHours < wkBand.low || weekHours > wkBand.high)) {
      const holidayNote = wkInfo.holidayHits > 0 ? ` (${wkInfo.holidayHits} holiday${wkInfo.holidayHits > 1 ? 's' : ''} excluded)` : '';
      bannerText = weekHours < wkBand.low
        ? `⚠ This week's total is ${weekHours.toFixed(1)}h — ${(wkBand.low - weekHours).toFixed(1)}h below the ${wkBand.low.toFixed(1)}–${wkBand.high.toFixed(1)}h target${holidayNote}.`
        : `⚠ This week's total is ${weekHours.toFixed(1)}h — ${(weekHours - wkBand.high).toFixed(1)}h above the ${wkBand.low.toFixed(1)}–${wkBand.high.toFixed(1)}h target${holidayNote}.`;
    }

    return {
      todayMin,
      weekHours, weekHasData, wStatus, wkInfo,
      avgPerWeek, avgWorkdaysPerWeek, monthHasData, mStatus,
      weekExpense: sumFare(weekCommutes), monthExpense: sumFare(monthCommutes),
      monthLeaveDays, monthWfhCount, wfhRemaining: wfh.remaining, leaveWarnings,
      bannerText,
    };
  }, [shifts, commutes, holidays, leaves, wfhLogs]);

  const hoursBars = useMemo(() => {
    const today = new Date();
    const hset = holidaySet(holidays);
    const bars = [];
    for (let i = 5; i >= 0; i--) {
      const anchor = addDays(today, -7 * i);
      const s = startOfWeek(anchor), e = endOfWeek(anchor);
      const total = sumNetHours(shiftsInRange(shifts, s, e));
      const { workdays } = rangeWorkdayInfo(s, e, hset);
      const band = workdayBand(workdays);
      bars.push({
        label: `${s.getMonth() + 1}/${s.getDate()}`,
        value: total,
        title: `${weekLabel(s, e)}: ${total.toFixed(1)}h`,
        colorClass: total < band.low || total > band.high ? (total === 0 ? '' : 'warn') : 'good',
      });
    }
    return bars;
  }, [shifts, holidays]);

  const expenseBars = useMemo(() => {
    const today = new Date();
    const bars = [];
    for (let i = 5; i >= 0; i--) {
      const anchor = addDays(today, -7 * i);
      const s = startOfWeek(anchor), e = endOfWeek(anchor);
      const total = sumFare(commutesInRange(commutes, s, e));
      bars.push({ label: `${s.getMonth() + 1}/${s.getDate()}`, value: total, title: `${weekLabel(s, e)}: ₹${total}`, colorClass: 'good' });
    }
    return bars;
  }, [commutes]);

  const breakdown = useMemo(() => {
    const monthCommutes = commutes.filter(c => c.date.slice(0, 7) === monthKeyOf(new Date()));
    const total = sumFare(monthCommutes);
    if (!total) return { total: 0, rows: [] };
    const byCategory = {};
    monthCommutes.forEach(c => {
      const key = categoryText(c);
      byCategory[key] = (byCategory[key] || 0) + (Number(c.fare) || 0);
    });
    const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([label, amount]) => ({
      label, amount, pct: Math.round((amount / total) * 100), color: CATEGORY_DOT_COLORS[label] || '#9aa4b2',
    }));
    return { total, rows };
  }, [commutes]);

  const recentShifts = useMemo(() => [...shifts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [shifts]);
  const recentCommuteGroups = useMemo(
    () => groupCommutesByDate(commutes).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [commutes],
  );
  const recentLeaves = useMemo(() => [...leaves].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [leaves]);
  const recentWfh = useMemo(() => [...wfhLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [wfhLogs]);

  return (
    <section>
      {stats.bannerText && <div className="banner banner-warn">{stats.bannerText}</div>}
      {stats.leaveWarnings.map(w => <div className="banner banner-warn" key={w}>{w}</div>)}

      <QuickPunch />

      <div className="stat-grid">
        <div className="card stat-card">
          <span className="stat-label">Today's Net Hours</span>
          <span className="stat-value">{stats.todayMin == null ? '–' : minutesToHoursLabel(stats.todayMin)}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">This Week Hours</span>
          <span className="stat-value">{stats.weekHours.toFixed(1)}h</span>
          <span className={`badge ${stats.weekHasData ? stats.wStatus.cls : 'badge-neutral'}`}>
            {stats.weekHasData ? stats.wStatus.label : 'No data'}
          </span>
          <span className="muted">{targetLabel(stats.wkInfo.workdays, stats.wkInfo.holidayHits)}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">This Month Avg / Week</span>
          <span className="stat-value">{stats.avgPerWeek.toFixed(1)}h</span>
          <span className={`badge ${stats.monthHasData ? stats.mStatus.cls : 'badge-neutral'}`}>
            {stats.monthHasData ? stats.mStatus.label : 'No data'}
          </span>
          {stats.monthHasData && <span className="muted">{targetLabel(stats.avgWorkdaysPerWeek, 0)}</span>}
        </div>
        <div className="card stat-card">
          <span className="stat-label">This Week Commute Spend</span>
          <span className="stat-value">₹{stats.weekExpense}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">This Month Commute Spend</span>
          <span className="stat-value">₹{stats.monthExpense}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">This Month Leaves</span>
          <span className="stat-value">{stats.monthLeaveDays}</span>
          <span className="muted">days taken</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">This Month WFH</span>
          <span className="stat-value">{stats.monthWfhCount}</span>
          <span className="muted">{stats.wfhRemaining} remaining of {WFH_ANNUAL_CAP}/yr</span>
        </div>
      </div>

      <div className="card">
        <h3>Weekly Hours Trend <span className="muted">(last 6 weeks · target 36–40 hrs)</span></h3>
        <BarChart bars={hoursBars} />
      </div>

      <div className="grid-2col">
        <div className="card">
          <h3>Commute Spend Trend <span className="muted">(last 6 weeks)</span></h3>
          <BarChart bars={expenseBars} />
        </div>
        <div className="card">
          <h3>Expense Breakdown <span className="muted">(this month)</span></h3>
          {!breakdown.rows.length
            ? <p className="muted">No expenses logged this month</p>
            : breakdown.rows.map(r => (
              <div className="hbar-row" key={r.label}>
                <div className="hbar-row-label"><span>{r.label}</span><span>₹{r.amount} ({r.pct}%)</span></div>
                <div className="hbar-track"><div className="hbar-fill" style={{ width: `${r.pct}%`, background: r.color }}></div></div>
              </div>
            ))}
        </div>
      </div>

      <div className="grid-2col">
        <div className="card">
          <h3>Recent Shift Entries</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Net Hrs</th></tr></thead>
              <tbody>
                {recentShifts.length ? recentShifts.map(s => (
                  <tr key={s.id}>
                    <td>{s.date}</td><td>{s.punchIn || '–'}</td><td>{s.punchOut || '–'}</td>
                    <td>{minutesToHoursLabel(computeNetMinutes(s))}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="muted">No entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>Recent Commute Entries</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Morning</th><th>Evening</th><th>Other</th><th>Total ₹</th></tr></thead>
              <tbody>
                {recentCommuteGroups.length ? recentCommuteGroups.map(g => (
                  <tr key={g.date}>
                    <td>{g.date}</td>
                    <td>{g.morning ? `${modeText(g.morning)} · ₹${g.morning.fare}` : '–'}</td>
                    <td>{g.evening ? `${modeText(g.evening)} · ₹${g.evening.fare}` : '–'}</td>
                    <td>{g.other.length ? g.other.map(o => `${o.notes || 'Other'} · ₹${o.fare}`).join(', ') : '–'}</td>
                    <td>₹{g.total}</td>
                  </tr>
                )) : <tr><td colSpan={5} className="muted">No entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card">
          <h3>Recent Leave Entries</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Days</th></tr></thead>
              <tbody>
                {recentLeaves.length ? recentLeaves.map(l => (
                  <tr key={l.id}>
                    <td>{l.date}</td><td>{LEAVE_TYPES[l.type] || l.type}</td><td>{l.days}</td>
                  </tr>
                )) : <tr><td colSpan={3} className="muted">No entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>Recent WFH Entries</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {recentWfh.length ? recentWfh.map(w => (
                  <tr key={w.id}>
                    <td>{w.date}</td><td>{w.notes}</td>
                  </tr>
                )) : <tr><td colSpan={2} className="muted">No entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
