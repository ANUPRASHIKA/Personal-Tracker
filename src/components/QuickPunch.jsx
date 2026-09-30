import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { todayStr, pad2 } from '../lib/dates';
import { computeNetMinutes, minutesToHoursLabel } from '../lib/shift';
import { uid } from '../lib/id';

export default function QuickPunch() {
  const { shifts, addShift, updateShift } = useData();
  const showToast = useToast();
  const today = todayStr();
  const todayShift = shifts.find(s => s.date === today);

  function punchIn() {
    if (todayShift) { showToast('Already punched in today'); return; }
    const now = new Date();
    const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    addShift({ id: uid(), date: today, punchIn: time, punchOut: null, breakMin: 60, callMin: 0, notes: '' });
    showToast('Punched in at ' + time);
  }

  function punchOut() {
    if (!todayShift) { showToast('Please punch in first'); return; }
    if (todayShift.punchOut) { showToast('Already punched out today'); return; }
    const now = new Date();
    const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    updateShift(todayShift.id, { ...todayShift, punchOut: time });
    showToast('Punched out at ' + time);
  }

  let statusText = 'No entry for today yet.';
  if (todayShift && !todayShift.punchOut) statusText = `Punched in at ${todayShift.punchIn}. Still in office.`;
  else if (todayShift) statusText = `In: ${todayShift.punchIn} · Out: ${todayShift.punchOut} · Net: ${minutesToHoursLabel(computeNetMinutes(todayShift))}`;

  return (
    <div className="quick-punch card">
      <div className="quick-punch-info">
        <h3>Quick Punch</h3>
        <p className="muted">{statusText}</p>
      </div>
      <div className="quick-punch-actions">
        <button className="btn btn-primary" onClick={punchIn}>Punch In Now</button>
        <button className="btn btn-secondary" onClick={punchOut}>Punch Out Now</button>
      </div>
    </div>
  );
}
