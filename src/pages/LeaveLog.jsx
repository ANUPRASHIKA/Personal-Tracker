import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { uid } from '../lib/id';
import { todayStr } from '../lib/dates';
import {
  LEAVE_TYPES, computeLeaveBalances, wfhUsage, monthlyWarnings, lastMonths, leaveUsageByType,
  WFH_ANNUAL_CAP, ANNUAL_CARRY_FORWARD_CAP, WFH_MONTHLY_WARN_THRESHOLD, LEAVES_MONTHLY_WARN_THRESHOLD,
} from '../lib/leave';
import BarChart from '../components/BarChart';
import { useSortFilter } from '../hooks/useSortFilter';
import SortableTh from '../components/SortableTh';

const EMPTY_LEAVE_FORM = { date: todayStr(), type: 'casual', days: '1', notes: '' };
const EMPTY_WFH_FORM = { date: todayStr(), notes: '' };

export default function LeaveLog() {
  const {
    leaves, wfhLogs, leaveSettings,
    addLeave, updateLeave, deleteLeave,
    addWfh, updateWfh, deleteWfh,
  } = useData();
  const showToast = useToast();

  const [leaveForm, setLeaveForm] = useState(EMPTY_LEAVE_FORM);
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [wfhForm, setWfhForm] = useState(EMPTY_WFH_FORM);
  const [editingWfhId, setEditingWfhId] = useState(null);

  const balances = useMemo(() => computeLeaveBalances(leaves, leaveSettings), [leaves, leaveSettings]);
  const usage = useMemo(() => leaveUsageByType(leaves), [leaves]);
  const usageTotal = useMemo(() => Object.values(usage).reduce((s, v) => s + v, 0), [usage]);
  const wfh = useMemo(() => wfhUsage(wfhLogs), [wfhLogs]);
  const warnings = useMemo(() => monthlyWarnings(leaves, wfhLogs), [leaves, wfhLogs]);
  const trendMonths = useMemo(() => lastMonths(6), []);

  const leaveTrendBars = useMemo(() => trendMonths.map(m => {
    const total = leaves.filter(l => l.date.slice(0, 7) === m.monthKey).reduce((s, l) => s + (Number(l.days) || 0), 0);
    return {
      label: m.label, value: total, title: `${m.label}: ${total} day${total === 1 ? '' : 's'}`,
      colorClass: total === 0 ? '' : total > LEAVES_MONTHLY_WARN_THRESHOLD ? 'warn' : 'good',
    };
  }), [leaves, trendMonths]);

  const wfhTrendBars = useMemo(() => trendMonths.map(m => {
    const total = wfhLogs.filter(w => w.date.slice(0, 7) === m.monthKey).length;
    return {
      label: m.label, value: total, title: `${m.label}: ${total} day${total === 1 ? '' : 's'}`,
      colorClass: total === 0 ? '' : total > WFH_MONTHLY_WARN_THRESHOLD ? 'warn' : 'good',
    };
  }), [wfhLogs, trendMonths]);

  function resetLeaveForm() { setEditingLeaveId(null); setLeaveForm(EMPTY_LEAVE_FORM); }
  function editLeave(l) { setEditingLeaveId(l.id); setLeaveForm({ date: l.date, type: l.type, days: String(l.days), notes: l.notes || '' }); }
  function removeLeave(id) {
    if (!confirm('Delete this leave entry?')) return;
    deleteLeave(id);
    showToast('Leave entry deleted');
  }
  function submitLeave(e) {
    e.preventDefault();
    const entry = { id: editingLeaveId || uid(), date: leaveForm.date, type: leaveForm.type, days: Number(leaveForm.days), notes: leaveForm.notes.trim() };
    const dupe = leaves.some(l => l.date === entry.date && l.type === entry.type && l.id !== entry.id);
    if (dupe) { showToast(`A ${LEAVE_TYPES[entry.type]} leave entry already exists for this date — edit that one instead`); return; }
    if (editingLeaveId) updateLeave(editingLeaveId, entry); else addLeave(entry);
    resetLeaveForm();
    showToast('Leave entry saved');
  }

  function resetWfhForm() { setEditingWfhId(null); setWfhForm(EMPTY_WFH_FORM); }
  function editWfh(w) { setEditingWfhId(w.id); setWfhForm({ date: w.date, notes: w.notes || '' }); }
  function removeWfh(id) {
    if (!confirm('Delete this WFH entry?')) return;
    deleteWfh(id);
    showToast('WFH entry deleted');
  }
  function submitWfh(e) {
    e.preventDefault();
    const entry = { id: editingWfhId || uid(), date: wfhForm.date, notes: wfhForm.notes.trim() };
    const dupe = wfhLogs.some(w => w.date === entry.date && w.id !== entry.id);
    if (dupe) { showToast('A WFH entry already exists for this date — edit that one instead'); return; }
    if (editingWfhId) updateWfh(editingWfhId, entry); else addWfh(entry);
    resetWfhForm();
    showToast('WFH entry saved');
  }

  const sortedLeaves = useMemo(() => [...leaves].sort((a, b) => b.date.localeCompare(a.date)), [leaves]);
  const sortedWfh = useMemo(() => [...wfhLogs].sort((a, b) => b.date.localeCompare(a.date)), [wfhLogs]);

  const leaveSearchText = l => `${l.date} ${LEAVE_TYPES[l.type] || l.type} ${l.days} ${l.notes || ''}`;
  const leaveSorters = {
    date: l => l.date, type: l => LEAVE_TYPES[l.type] || l.type, days: l => Number(l.days) || 0, notes: l => l.notes || '',
  };
  const leaveTable = useSortFilter(sortedLeaves, leaveSearchText, leaveSorters, { key: 'date', dir: 'desc' });

  const wfhSearchText = w => `${w.date} ${w.notes || ''}`;
  const wfhSorters = { date: w => w.date, notes: w => w.notes || '' };
  const wfhTable = useSortFilter(sortedWfh, wfhSearchText, wfhSorters, { key: 'date', dir: 'desc' });

  return (
    <section>
      {warnings.map(w => <div className="banner banner-warn" key={w}>{w}</div>)}

      <div className="stat-grid">
        <div className="card stat-card">
          <span className="stat-label">Sick Leave</span>
          <span className="stat-value">{balances.sick.toFixed(2)}</span>
          <span className="muted">of 12/yr</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Casual Leave</span>
          <span className="stat-value">{balances.casual.toFixed(2)}</span>
          <span className="muted">of 12/yr</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Annual Leave</span>
          <span className="stat-value">{balances.annualActual.toFixed(2)}</span>
          <span className="muted">
            {balances.annualActual > ANNUAL_CARRY_FORWARD_CAP
              ? `Capped at ${ANNUAL_CARRY_FORWARD_CAP} for carry-forward`
              : `carry-forward cap ${ANNUAL_CARRY_FORWARD_CAP}`}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Tenure Leave</span>
          <span className="stat-value">{balances.tenure.toFixed(2)}</span>
          <span className="muted">of {leaveSettings.tenureEligible ? 1 : 0}/yr</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Wellness Leave</span>
          <span className="stat-value">{balances.wellness.toFixed(2)}</span>
          <span className="muted">lapses monthly</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">WFH Remaining</span>
          <span className="stat-value">{wfh.remaining}</span>
          <span className="muted">of {WFH_ANNUAL_CAP}/yr · {wfh.usedThisMonth} this month</span>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card">
          <h3>Leave Trend <span className="muted">(last 6 months)</span></h3>
          <BarChart bars={leaveTrendBars} />
        </div>
        <div className="card">
          <h3>WFH Trend <span className="muted">(last 6 months)</span></h3>
          <BarChart bars={wfhTrendBars} />
        </div>
      </div>

      <div className="card">
        <h3>{editingLeaveId ? 'Edit Leave Entry' : 'Add Leave Entry'}</h3>
        <form className="form-grid" onSubmit={submitLeave}>
          <label>Date
            <input type="date" required value={leaveForm.date} onChange={e => setLeaveForm({ ...leaveForm, date: e.target.value })} />
          </label>
          <label>Type
            <select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}>
              {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Duration
            <select value={leaveForm.days} onChange={e => setLeaveForm({ ...leaveForm, days: e.target.value })}>
              <option value="1">Full day</option>
              <option value="0.5">Half day</option>
            </select>
          </label>
          <label className="span-2">Notes
            <input type="text" placeholder="Optional" value={leaveForm.notes} onChange={e => setLeaveForm({ ...leaveForm, notes: e.target.value })} />
          </label>
          <div className="form-actions span-2">
            <button type="submit" className="btn btn-primary">Save Entry</button>
            {editingLeaveId && <button type="button" className="btn btn-secondary" onClick={resetLeaveForm}>Cancel Edit</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Leave Days Availed <span className="muted">(this year, by category)</span></h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Days Availed</th></tr></thead>
            <tbody>
              {Object.entries(LEAVE_TYPES).map(([k, label]) => (
                <tr key={k}><td>{label}</td><td>{usage[k].toFixed(2)}</td></tr>
              ))}
              <tr><td><strong>Total</strong></td><td><strong>{usageTotal.toFixed(2)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>All Leave Entries</h3>
        <input className="table-filter" type="text" placeholder="Filter entries…" value={leaveTable.search} onChange={e => leaveTable.setSearch(e.target.value)} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableTh label="Date" sortKey="date" activeKey={leaveTable.sortKey} dir={leaveTable.sortDir} onSort={leaveTable.toggleSort} />
                <SortableTh label="Type" sortKey="type" activeKey={leaveTable.sortKey} dir={leaveTable.sortDir} onSort={leaveTable.toggleSort} />
                <SortableTh label="Days" sortKey="days" activeKey={leaveTable.sortKey} dir={leaveTable.sortDir} onSort={leaveTable.toggleSort} />
                <SortableTh label="Notes" sortKey="notes" activeKey={leaveTable.sortKey} dir={leaveTable.sortDir} onSort={leaveTable.toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leaveTable.rows.length ? leaveTable.rows.map(l => (
                <tr key={l.id}>
                  <td>{l.date}</td>
                  <td>{LEAVE_TYPES[l.type] || l.type}</td>
                  <td>{l.days}</td>
                  <td>{l.notes}</td>
                  <td className="row-actions">
                    <button className="btn btn-small" onClick={() => editLeave(l)}>Edit</button>
                    <button className="btn btn-small btn-danger" onClick={() => removeLeave(l.id)}>Del</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="muted">No leave entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>{editingWfhId ? 'Edit WFH Entry' : 'Add WFH Entry'}</h3>
        <form className="form-grid" onSubmit={submitWfh}>
          <label>Date
            <input type="date" required value={wfhForm.date} onChange={e => setWfhForm({ ...wfhForm, date: e.target.value })} />
          </label>
          <label className="span-2">Notes
            <input type="text" placeholder="Optional" value={wfhForm.notes} onChange={e => setWfhForm({ ...wfhForm, notes: e.target.value })} />
          </label>
          <div className="form-actions span-2">
            <button type="submit" className="btn btn-primary">Save Entry</button>
            {editingWfhId && <button type="button" className="btn btn-secondary" onClick={resetWfhForm}>Cancel Edit</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>All WFH Entries</h3>
        <input className="table-filter" type="text" placeholder="Filter entries…" value={wfhTable.search} onChange={e => wfhTable.setSearch(e.target.value)} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableTh label="Date" sortKey="date" activeKey={wfhTable.sortKey} dir={wfhTable.sortDir} onSort={wfhTable.toggleSort} />
                <SortableTh label="Notes" sortKey="notes" activeKey={wfhTable.sortKey} dir={wfhTable.sortDir} onSort={wfhTable.toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {wfhTable.rows.length ? wfhTable.rows.map(w => (
                <tr key={w.id}>
                  <td>{w.date}</td>
                  <td>{w.notes}</td>
                  <td className="row-actions">
                    <button className="btn btn-small" onClick={() => editWfh(w)}>Edit</button>
                    <button className="btn btn-small btn-danger" onClick={() => removeWfh(w.id)}>Del</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={3} className="muted">No WFH entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
