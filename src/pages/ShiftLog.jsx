import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { todayStr } from '../lib/dates';
import { computeNetMinutes, minutesToHoursLabel } from '../lib/shift';
import { uid } from '../lib/id';

const EMPTY_FORM = { date: todayStr(), punchIn: '09:00', punchOut: '17:00', breakMin: 60, callMin: 0, notes: '' };

export default function ShiftLog() {
  const { shifts, addShift, updateShift, deleteShift } = useData();
  const showToast = useToast();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const preview = useMemo(() => {
    if (!form.punchIn || !form.punchOut) return 'Net hours will appear here once both times are set.';
    const mins = computeNetMinutes(form);
    const hrs = mins / 60;
    const diff = hrs - 7;
    return `Net: ${minutesToHoursLabel(mins)} (target 7h/day)` + (Math.abs(diff) > 0.01 ? ` · ${diff > 0 ? '+' : ''}${diff.toFixed(2)}h vs target` : ' · on target');
  }, [form]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function edit(s) {
    setEditingId(s.id);
    setForm({ date: s.date, punchIn: s.punchIn || '', punchOut: s.punchOut || '', breakMin: s.breakMin, callMin: s.callMin, notes: s.notes || '' });
  }

  function remove(id) {
    if (!confirm('Delete this shift entry?')) return;
    deleteShift(id);
    showToast('Shift entry deleted');
  }

  function submit(e) {
    e.preventDefault();
    const entry = {
      id: editingId || uid(),
      date: form.date,
      punchIn: form.punchIn,
      punchOut: form.punchOut || null,
      breakMin: Number(form.breakMin) || 0,
      callMin: Number(form.callMin) || 0,
      notes: form.notes.trim(),
    };
    const dupe = shifts.some(s => s.date === entry.date && s.id !== entry.id);
    if (dupe) { showToast('A shift entry already exists for this date — edit that one instead'); return; }
    if (editingId) updateShift(editingId, entry); else addShift(entry);
    resetForm();
    showToast('Shift entry saved');
  }

  const sorted = useMemo(
    () => [...shifts].sort((a, b) => b.date.localeCompare(a.date) || (b.punchIn || '').localeCompare(a.punchIn || '')),
    [shifts],
  );

  return (
    <section>
      <div className="card">
        <h3>{editingId ? 'Edit Shift Entry' : 'Add Shift Entry'}</h3>
        <form className="form-grid" onSubmit={submit}>
          <label>Date
            <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>Punch In
            <input type="time" required value={form.punchIn} onChange={e => setForm({ ...form, punchIn: e.target.value })} />
          </label>
          <label>Punch Out <span className="muted">(leave blank if still in office)</span>
            <input type="time" value={form.punchOut} onChange={e => setForm({ ...form, punchOut: e.target.value })} />
          </label>
          <label>Break (minutes)
            <input type="number" min="0" step="5" value={form.breakMin} onChange={e => setForm({ ...form, breakMin: e.target.value })} />
          </label>
          <label>After-hours Call (minutes)
            <input type="number" min="0" step="5" value={form.callMin} onChange={e => setForm({ ...form, callMin: e.target.value })} />
          </label>
          <label className="span-2">Notes
            <input type="text" placeholder="Optional" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </label>

          <div className="preview-box span-2">{preview}</div>

          <div className="form-actions span-2">
            <button type="submit" className="btn btn-primary">Save Entry</button>
            {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel Edit</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>All Shift Entries</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>In</th><th>Out</th><th>Break</th><th>Calls</th><th>Net Hrs</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {sorted.length ? sorted.map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.punchIn || '–'}</td>
                  <td>{s.punchOut || 'In progress'}</td>
                  <td>{s.breakMin}m</td>
                  <td>{s.callMin}m</td>
                  <td>{minutesToHoursLabel(computeNetMinutes(s))}</td>
                  <td>{s.notes}</td>
                  <td className="row-actions">
                    <button className="btn btn-small" onClick={() => edit(s)}>Edit</button>
                    <button className="btn btn-small btn-danger" onClick={() => remove(s.id)}>Del</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={8} className="muted">No shift entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
