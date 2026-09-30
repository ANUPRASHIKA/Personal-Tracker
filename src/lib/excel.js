import * as XLSX from '@e965/xlsx';
import { pad2, todayStr } from './dates';

// Excel may store dates/times as its own serial numbers if a cell gets reformatted; normalize back to our string formats.
function normalizeExcelDate(val) {
  if (typeof val === 'number') { const d = XLSX.SSF.parse_date_code(val); return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`; }
  return String(val || '').slice(0, 10);
}
function normalizeExcelTime(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') { const mins = Math.round(val * 24 * 60) % (24 * 60); return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`; }
  return String(val);
}

export function exportExcel(shifts, commutes, holidays) {
  const wb = XLSX.utils.book_new();
  const shiftRows = shifts.map(s => ({ id: s.id, date: s.date, punchIn: s.punchIn || '', punchOut: s.punchOut || '', breakMin: s.breakMin, callMin: s.callMin, notes: s.notes || '' }));
  const commuteRows = commutes.map(c => ({ id: c.id, date: c.date, type: c.type || 'commute', period: c.period || '', route: c.route || '', routeRemark: c.routeRemark || '', mode: c.mode || '', modeRemark: c.modeRemark || '', payment: c.payment, paymentRemark: c.paymentRemark || '', fare: c.fare, notes: c.notes || '' }));
  const holidayRows = holidays.map(h => ({ id: h.id, date: h.date, name: h.name }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shiftRows), 'Shifts');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commuteRows), 'Commutes');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(holidayRows), 'Holidays');
  XLSX.writeFile(wb, `personal-tracker-${todayStr()}.xlsx`);
}

// Reads an .xlsx File and returns { shifts, commutes, holidays } for whichever sheets were present (others are undefined).
export function importExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      let wb;
      try { wb = XLSX.read(reader.result, { type: 'array' }); }
      catch (e) { reject(new Error('Could not read that Excel file')); return; }
      if (!wb.Sheets['Shifts'] && !wb.Sheets['Commutes'] && !wb.Sheets['Holidays']) {
        reject(new Error('No Shifts/Commutes/Holidays sheet found in that file'));
        return;
      }
      const result = {};
      if (wb.Sheets['Shifts']) {
        result.shifts = XLSX.utils.sheet_to_json(wb.Sheets['Shifts']).map(r => ({
          id: String(r.id || cryptoId()), date: normalizeExcelDate(r.date), punchIn: normalizeExcelTime(r.punchIn), punchOut: normalizeExcelTime(r.punchOut),
          breakMin: Number(r.breakMin) || 0, callMin: Number(r.callMin) || 0, notes: r.notes ? String(r.notes) : '',
        }));
      }
      if (wb.Sheets['Commutes']) {
        result.commutes = XLSX.utils.sheet_to_json(wb.Sheets['Commutes']).map(r => ({
          id: String(r.id || cryptoId()), date: normalizeExcelDate(r.date), type: r.type === 'other' ? 'other' : 'commute',
          period: r.period || null, route: r.route || null, routeRemark: r.routeRemark ? String(r.routeRemark) : '',
          mode: r.mode || null, modeRemark: r.modeRemark ? String(r.modeRemark) : '', payment: r.payment, paymentRemark: r.paymentRemark ? String(r.paymentRemark) : '',
          fare: Number(r.fare) || 0, notes: r.notes ? String(r.notes) : '',
        }));
      }
      if (wb.Sheets['Holidays']) {
        result.holidays = XLSX.utils.sheet_to_json(wb.Sheets['Holidays']).map(r => ({ id: String(r.id || cryptoId()), date: normalizeExcelDate(r.date), name: String(r.name || '') }));
      }
      resolve(result);
    };
    reader.readAsArrayBuffer(file);
  });
}

function cryptoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
