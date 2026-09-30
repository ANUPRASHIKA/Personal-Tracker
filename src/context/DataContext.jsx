import { createContext, useContext, useEffect } from 'react';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { dedupeShifts, dedupeCommutes } from '../lib/commute';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [shifts, setShifts] = useLocalStorageState('pt_shifts', []);
  const [commutes, setCommutes] = useLocalStorageState('pt_commutes', []);
  const [holidays, setHolidays] = useLocalStorageState('pt_holidays', []);

  // Clean up any duplicates left over from before dupe-checks existed, once on load.
  useEffect(() => {
    setShifts(prev => dedupeShifts(prev));
    setCommutes(prev => dedupeCommutes(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    shifts, commutes, holidays,
    addShift(entry) { setShifts(prev => [...prev, entry]); },
    updateShift(id, entry) { setShifts(prev => prev.map(s => (s.id === id ? entry : s))); },
    deleteShift(id) { setShifts(prev => prev.filter(s => s.id !== id)); },
    upsertTodayPunch(entry) { setShifts(prev => [...prev.filter(s => s.date !== entry.date), entry]); },

    addCommute(entry) { setCommutes(prev => [...prev, entry]); },
    updateCommute(id, entry) { setCommutes(prev => prev.map(c => (c.id === id ? entry : c))); },
    deleteCommute(id) { setCommutes(prev => prev.filter(c => c.id !== id)); },

    addHoliday(entry) { setHolidays(prev => [...prev, entry]); },
    deleteHoliday(id) { setHolidays(prev => prev.filter(h => h.id !== id)); },

    dedupeAll() {
      const dedupedShifts = dedupeShifts(shifts);
      const dedupedCommutes = dedupeCommutes(commutes);
      const removed = (shifts.length - dedupedShifts.length) + (commutes.length - dedupedCommutes.length);
      setShifts(dedupedShifts);
      setCommutes(dedupedCommutes);
      return removed;
    },

    replaceAll({ shifts: s, commutes: c, holidays: h }) {
      if (s) setShifts(s);
      if (c) setCommutes(c);
      if (h) setHolidays(h);
    },

    clearAll() {
      setShifts([]); setCommutes([]); setHolidays([]);
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
