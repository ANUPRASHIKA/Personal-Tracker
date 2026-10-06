import { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { todayStr, DOW_SHORT, parseDateStr } from '../lib/dates';
import { uid } from '../lib/id';
import { exportExcel, importExcel } from '../lib/excel';
import { useSortFilter } from '../hooks/useSortFilter';
import SortableTh from '../components/SortableTh';

export default function Settings() {
  const {
    shifts, commutes, holidays, addHoliday, deleteHoliday, dedupeAll, replaceAll, clearAll,
    leaves, wfhLogs, leaveSettings, updateLeaveSettings,
  } = useData();
  const showToast = useToast();
  const [holidayDate, setHolidayDate] = useState(todayStr());
  const [holidayName, setHolidayName] = useState('');
  const jsonInputRef = useRef(null);
  const excelInputRef = useRef(null);

  function addHolidayEntry(e) {
    e.preventDefault();
    if (holidays.some(h => h.date === holidayDate)) { showToast('Holiday already marked for this date'); return; }
    addHoliday({ id: uid(), date: holidayDate, name: holidayName.trim() });
    setHolidayDate(todayStr());
    setHolidayName('');
    showToast('Holiday added');
  }

  function removeHoliday(id) {
    if (!confirm('Remove this holiday?')) return;
    deleteHoliday(id);
    showToast('Holiday removed');
  }

  function exportJson() {
    const payload = { shifts, commutes, holidays, leaves, wfhLogs, leaveSettings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `personal-tracker-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (e) { showToast('Invalid backup file'); return; }
      if (!Array.isArray(data.shifts) || !Array.isArray(data.commutes)) { showToast('Backup file is missing expected data'); return; }
      if (!confirm('Import will replace all current data in this tracker. Continue?')) return;
      replaceAll({
        shifts: data.shifts, commutes: data.commutes, holidays: Array.isArray(data.holidays) ? data.holidays : [],
        leaves: Array.isArray(data.leaves) ? data.leaves : [], wfhLogs: Array.isArray(data.wfhLogs) ? data.wfhLogs : [],
        leaveSettings: data.leaveSettings,
      });
      showToast('Backup imported');
    };
    reader.readAsText(file);
  }

  function handleDedupe() {
    const removed = dedupeAll();
    showToast(removed ? `Removed ${removed} duplicate entr${removed > 1 ? 'ies' : 'y'}` : 'No duplicates found');
  }

  function handleClearAll() {
    if (!confirm('This will permanently delete all shifts, commutes and holidays from this browser. Export a backup first if you want to keep it. Continue?')) return;
    clearAll();
    showToast('All data cleared');
  }

  function handleExportExcel() {
    exportExcel(shifts, commutes, holidays, leaves, wfhLogs);
    showToast('Excel file downloaded');
  }

  function handleImportExcel(file) {
    importExcel(file).then(result => {
      if (!confirm('Import will replace the data for each matching sheet (Shifts / Commutes / Holidays / Leaves / WFH) found in this file. Continue?')) return;
      replaceAll(result);
      showToast('Excel data imported');
    }).catch(err => showToast(err.message));
  }

  const sortedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const holidaySearchText = h => `${h.date} ${DOW_SHORT[(parseDateStr(h.date).getDay() + 6) % 7]} ${h.name}`;
  const holidaySorters = {
    date: h => h.date, day: h => DOW_SHORT[(parseDateStr(h.date).getDay() + 6) % 7], name: h => h.name,
  };
  const holidayTable = useSortFilter(sortedHolidays, holidaySearchText, holidaySorters, { key: 'date', dir: 'asc' });

  return (
    <section>
      <div className="card">
        <h3>Company Holidays</h3>
        <p className="muted">Mark non-working days here. Weekly &amp; monthly hour targets (36–40h over a 5-day week) automatically shrink to exclude them.</p>
        <form className="form-grid" onSubmit={addHolidayEntry}>
          <label>Date
            <input type="date" required value={holidayDate} onChange={e => setHolidayDate(e.target.value)} />
          </label>
          <label>Name
            <input type="text" required placeholder="e.g. Diwali" value={holidayName} onChange={e => setHolidayName(e.target.value)} />
          </label>
          <div className="form-actions span-2">
            <button type="submit" className="btn btn-primary">Add Holiday</button>
          </div>
        </form>
        <input className="table-filter" type="text" placeholder="Filter holidays…" value={holidayTable.search} onChange={e => holidayTable.setSearch(e.target.value)} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableTh label="Date" sortKey="date" activeKey={holidayTable.sortKey} dir={holidayTable.sortDir} onSort={holidayTable.toggleSort} />
                <SortableTh label="Day" sortKey="day" activeKey={holidayTable.sortKey} dir={holidayTable.sortDir} onSort={holidayTable.toggleSort} />
                <SortableTh label="Name" sortKey="name" activeKey={holidayTable.sortKey} dir={holidayTable.sortDir} onSort={holidayTable.toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {holidayTable.rows.length ? holidayTable.rows.map(h => (
                <tr key={h.id}>
                  <td>{h.date}</td>
                  <td>{DOW_SHORT[(parseDateStr(h.date).getDay() + 6) % 7]}</td>
                  <td>{h.name}</td>
                  <td className="row-actions"><button className="btn btn-small btn-danger" onClick={() => removeHoliday(h.id)}>Del</button></td>
                </tr>
              )) : <tr><td colSpan={4} className="muted">No holidays marked yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Leave Policy</h3>
        <p className="muted">Sick/Casual/Tenure reset each calendar year and don't carry forward. Annual leave carries forward — set the balance/date below to match your company portal whenever you want to re-sync (e.g. after a year-end rollover).</p>
        <div className="form-grid">
          <label className="checkbox-label">
            <input type="checkbox" checked={leaveSettings.tenureEligible} onChange={e => updateLeaveSettings({ tenureEligible: e.target.checked })} />
            Eligible for tenure leave (5+ years)
          </label>
          <label>Annual Leave Opening Balance
            <input type="number" min="0" step="0.25" value={leaveSettings.annualOpeningBalance} onChange={e => updateLeaveSettings({ annualOpeningBalance: Number(e.target.value) || 0 })} />
          </label>
          <label>As Of Date
            <input type="date" value={leaveSettings.annualOpeningDate} onChange={e => updateLeaveSettings({ annualOpeningDate: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Backup &amp; Restore</h3>
        <p className="muted">Entries save automatically to this browser as you add them — no extra step needed. Export a backup file now and then so your data survives a cleared browser cache or a new device.</p>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={exportJson}>Export Backup (JSON)</button>
          <label className="btn btn-secondary" onClick={() => jsonInputRef.current?.click()}>
            Import Backup
            <input ref={jsonInputRef} type="file" accept="application/json" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ''; }} />
          </label>
          <button className="btn btn-secondary" onClick={handleDedupe}>Remove Duplicate Entries</button>
          <button className="btn btn-danger" onClick={handleClearAll}>Clear All Data</button>
        </div>
      </div>

      <div className="card">
        <h3>Excel Sync (for using this on another device, e.g. mobile)</h3>
        <p className="muted">Export to an .xlsx file, save it in a folder that syncs across your devices (OneDrive, Google Drive, etc.), then open this same tracker on the other device and use Import there to pull the data in.</p>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleExportExcel}>Export to Excel (.xlsx)</button>
          <label className="btn btn-secondary" onClick={() => excelInputRef.current?.click()}>
            Import from Excel
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) handleImportExcel(f); e.target.value = ''; }} />
          </label>
        </div>
      </div>
    </section>
  );
}
