import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { todayStr } from '../lib/dates';
import { uid } from '../lib/id';
import {
  FARE_DEFAULTS, ROUTE_DEFAULTS, modeText, paymentText, groupCommutesByDate,
} from '../lib/commute';

const EMPTY_FORM = {
  date: todayStr(), type: 'commute',
  period: 'morning', route: ROUTE_DEFAULTS.morning, routeRemark: '',
  mode: 'auto', modeRemark: '',
  payment: 'gpay', paymentRemark: '',
  fare: FARE_DEFAULTS.morning, notes: '',
};

function EntryCell({ entry, onEdit, onDelete }) {
  if (!entry) return <span className="muted">–</span>;
  return (
    <>
      <div>{entry.type === 'other' ? (entry.notes || 'Other') : modeText(entry)} · {paymentText(entry)} · ₹{entry.fare}</div>
      <div className="row-actions">
        <button className="btn btn-small" onClick={() => onEdit(entry)}>Edit</button>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(entry.id)}>Del</button>
      </div>
    </>
  );
}

function OtherCell({ entries, onEdit, onDelete }) {
  if (!entries.length) return <span className="muted">–</span>;
  return entries.map((entry, i) => (
    <div key={entry.id} style={i > 0 ? { borderTop: '1px solid var(--border)', marginTop: '0.4rem', paddingTop: '0.4rem' } : undefined}>
      <div>{entry.notes || 'Other'} · {paymentText(entry)} · ₹{entry.fare}</div>
      <div className="row-actions">
        <button className="btn btn-small" onClick={() => onEdit(entry)}>Edit</button>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(entry.id)}>Del</button>
      </div>
    </div>
  ));
}

export default function CommuteLog() {
  const { commutes, addCommute, updateCommute, deleteCommute } = useData();
  const showToast = useToast();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const isOther = form.type === 'other';

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function edit(c) {
    setEditingId(c.id);
    setForm({
      date: c.date, type: c.type || 'commute',
      period: c.period || 'morning', route: c.route || 'home-office', routeRemark: c.routeRemark || '',
      mode: c.mode || 'auto', modeRemark: c.modeRemark || '',
      payment: c.payment, paymentRemark: c.paymentRemark || '',
      fare: c.fare, notes: c.notes || '',
    });
  }

  function remove(id) {
    if (!confirm('Delete this commute entry?')) return;
    deleteCommute(id);
    showToast('Commute entry deleted');
  }

  function changePeriod(period) {
    setForm(prev => {
      const next = { ...prev, period };
      if (!editingId) { next.fare = FARE_DEFAULTS[period]; next.route = ROUTE_DEFAULTS[period]; }
      return next;
    });
  }

  function submit(e) {
    e.preventDefault();
    const notes = form.notes.trim();
    if (isOther && !notes) { showToast('Please describe what this expense is for'); return; }
    const common = {
      id: editingId || uid(),
      date: form.date,
      payment: form.payment,
      paymentRemark: form.paymentRemark.trim(),
      fare: Number(form.fare) || 0,
      notes,
    };
    const entry = isOther
      ? { ...common, type: 'other', period: null, route: null, routeRemark: '', mode: null, modeRemark: '' }
      : {
        ...common,
        type: 'commute',
        period: form.period,
        route: form.route,
        routeRemark: form.routeRemark.trim(),
        mode: form.mode,
        modeRemark: form.modeRemark.trim(),
      };
    const dupe = entry.type === 'commute' && commutes.some(c => (c.type || 'commute') === 'commute' && c.date === entry.date && c.period === entry.period && c.id !== entry.id);
    if (dupe) { showToast(`A ${entry.period} commute entry already exists for this date — edit that one instead`); return; }
    if (editingId) updateCommute(editingId, entry); else addCommute(entry);
    resetForm();
    showToast('Commute entry saved');
  }

  const groups = useMemo(() => groupCommutesByDate(commutes).sort((a, b) => b.date.localeCompare(a.date)), [commutes]);

  return (
    <section>
      <div className="card">
        <h3>{editingId ? 'Edit Commute Entry' : 'Add Commute Entry'}</h3>
        <form className="form-grid" onSubmit={submit}>
          <label>Date
            <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>Entry Type
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="commute">Commute</option>
              <option value="other">Other Expense</option>
            </select>
          </label>

          {!isOther && (
            <div className="form-grid span-2">
              <label>Period
                <select value={form.period} onChange={e => changePeriod(e.target.value)}>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>
              </label>

              <label>Route
                <select value={form.route} onChange={e => setForm({ ...form, route: e.target.value })}>
                  <option value="home-office">Home → Office</option>
                  <option value="office-home">Office → Home</option>
                  <option value="other">Other</option>
                </select>
              </label>
              {form.route === 'other' && (
                <label>Route Remark
                  <input type="text" placeholder="e.g. Office to Client Site" value={form.routeRemark} onChange={e => setForm({ ...form, routeRemark: e.target.value })} />
                </label>
              )}

              <label>Commute Mode
                <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
                  <option value="auto">Auto</option>
                  <option value="metro">Metro</option>
                  <option value="other">Other</option>
                </select>
              </label>
              {form.mode === 'other' && (
                <label>Mode Remark
                  <input type="text" placeholder="e.g. Bus, Cab, Walk" value={form.modeRemark} onChange={e => setForm({ ...form, modeRemark: e.target.value })} />
                </label>
              )}
            </div>
          )}

          <label>Payment Mode
            <select value={form.payment} onChange={e => setForm({ ...form, payment: e.target.value })}>
              <option value="gpay">GPay</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </label>
          {form.payment === 'other' && (
            <label>Payment Remark
              <input type="text" placeholder="e.g. PhonePe, Paytm" value={form.paymentRemark} onChange={e => setForm({ ...form, paymentRemark: e.target.value })} />
            </label>
          )}

          <label>
            <span>{isOther ? 'Amount (₹)' : 'Fare (₹)'}</span> {!isOther && <span className="muted">(typical 350–500)</span>}
            <input type="number" min="0" step="1" value={form.fare} onChange={e => setForm({ ...form, fare: e.target.value })} />
          </label>
          <label className="span-2">
            <span>{isOther ? 'What is this expense for?' : 'Notes'}</span>
            <input type="text" placeholder={isOther ? 'e.g. Parking, Toll, Snacks' : 'Optional'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </label>

          <div className="form-actions span-2">
            <button type="submit" className="btn btn-primary">Save Entry</button>
            {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel Edit</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>All Commute Entries</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Morning</th><th>Evening</th><th>Other</th><th>Total ₹</th></tr></thead>
            <tbody>
              {groups.length ? groups.map(g => (
                <tr key={g.date}>
                  <td>{g.date}</td>
                  <td className="wrap-cell"><EntryCell entry={g.morning} onEdit={edit} onDelete={remove} /></td>
                  <td className="wrap-cell"><EntryCell entry={g.evening} onEdit={edit} onDelete={remove} /></td>
                  <td className="wrap-cell"><OtherCell entries={g.other} onEdit={edit} onDelete={remove} /></td>
                  <td>₹{g.total}</td>
                </tr>
              )) : <tr><td colSpan={5} className="muted">No commute entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
