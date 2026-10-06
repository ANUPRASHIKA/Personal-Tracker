import { createContext, useContext, useEffect } from 'react';
import { useUserData } from '../hooks/useUserData';
import { useAuth } from './AuthContext';
import { dedupeShifts, dedupeCommutes } from '../lib/commute';
import { defaultLeaveSettings, dedupeLeaves, dedupeWfh } from '../lib/leave';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [data, setData, loading] = useUserData(user?.uid ?? null);
  const { shifts, commutes, holidays, leaves, wfhLogs, leaveSettings } = data;

  function setShifts(updater) {
    setData(prev => ({ ...prev, shifts: typeof updater === 'function' ? updater(prev.shifts) : updater }));
  }
  function setCommutes(updater) {
    setData(prev => ({ ...prev, commutes: typeof updater === 'function' ? updater(prev.commutes) : updater }));
  }
  function setHolidays(updater) {
    setData(prev => ({ ...prev, holidays: typeof updater === 'function' ? updater(prev.holidays) : updater }));
  }
  function setLeaves(updater) {
    setData(prev => ({ ...prev, leaves: typeof updater === 'function' ? updater(prev.leaves) : updater }));
  }
  function setWfhLogs(updater) {
    setData(prev => ({ ...prev, wfhLogs: typeof updater === 'function' ? updater(prev.wfhLogs) : updater }));
  }

  // Clean up any duplicates left over from before dupe-checks existed, once data loads.
  useEffect(() => {
    if (loading) return;
    setShifts(prev => dedupeShifts(prev));
    setCommutes(prev => dedupeCommutes(prev));
    setLeaves(prev => dedupeLeaves(prev));
    setWfhLogs(prev => dedupeWfh(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const value = {
    shifts, commutes, holidays, leaves, wfhLogs, leaveSettings, loading,
    addShift(entry) { setShifts(prev => [...prev, entry]); },
    updateShift(id, entry) { setShifts(prev => prev.map(s => (s.id === id ? entry : s))); },
    deleteShift(id) { setShifts(prev => prev.filter(s => s.id !== id)); },
    upsertTodayPunch(entry) { setShifts(prev => [...prev.filter(s => s.date !== entry.date), entry]); },

    addCommute(entry) { setCommutes(prev => [...prev, entry]); },
    updateCommute(id, entry) { setCommutes(prev => prev.map(c => (c.id === id ? entry : c))); },
    deleteCommute(id) { setCommutes(prev => prev.filter(c => c.id !== id)); },

    addHoliday(entry) { setHolidays(prev => [...prev, entry]); },
    deleteHoliday(id) { setHolidays(prev => prev.filter(h => h.id !== id)); },

    addLeave(entry) { setLeaves(prev => [...prev, entry]); },
    updateLeave(id, entry) { setLeaves(prev => prev.map(l => (l.id === id ? entry : l))); },
    deleteLeave(id) { setLeaves(prev => prev.filter(l => l.id !== id)); },

    addWfh(entry) { setWfhLogs(prev => [...prev, entry]); },
    updateWfh(id, entry) { setWfhLogs(prev => prev.map(w => (w.id === id ? entry : w))); },
    deleteWfh(id) { setWfhLogs(prev => prev.filter(w => w.id !== id)); },

    updateLeaveSettings(patch) { setData(prev => ({ ...prev, leaveSettings: { ...prev.leaveSettings, ...patch } })); },

    dedupeAll() {
      const dedupedShifts = dedupeShifts(shifts);
      const dedupedCommutes = dedupeCommutes(commutes);
      const dedupedLeaves = dedupeLeaves(leaves);
      const dedupedWfh = dedupeWfh(wfhLogs);
      const removed = (shifts.length - dedupedShifts.length) + (commutes.length - dedupedCommutes.length)
        + (leaves.length - dedupedLeaves.length) + (wfhLogs.length - dedupedWfh.length);
      setShifts(dedupedShifts);
      setCommutes(dedupedCommutes);
      setLeaves(dedupedLeaves);
      setWfhLogs(dedupedWfh);
      return removed;
    },

    replaceAll({ shifts: s, commutes: c, holidays: h, leaves: l, wfhLogs: w, leaveSettings: ls }) {
      if (s) setShifts(s);
      if (c) setCommutes(c);
      if (h) setHolidays(h);
      if (l) setLeaves(l);
      if (w) setWfhLogs(w);
      if (ls) setData(prev => ({ ...prev, leaveSettings: { ...defaultLeaveSettings(), ...ls } }));
    },

    clearAll() {
      setShifts([]); setCommutes([]); setHolidays([]); setLeaves([]); setWfhLogs([]);
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}

