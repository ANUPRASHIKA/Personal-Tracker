import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const EMPTY = { shifts: [], commutes: [], holidays: [] };

// Loads/persists a signed-in user's tracker data as a single Firestore document (users/{uid}).
export function useUserData(uid) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const loadedUid = useRef(null);

  useEffect(() => {
    if (!uid) {
      loadedUid.current = null;
      setData(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (cancelled) return;
      const d = snap.exists() ? snap.data() : {};
      setData({ shifts: d.shifts || [], commutes: d.commutes || [], holidays: d.holidays || [] });
      loadedUid.current = uid;
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    // Skip writing back the data we just loaded, or before a user is known.
    if (!uid || loading || loadedUid.current !== uid) return;
    setDoc(doc(db, 'users', uid), data, { merge: true });
  }, [uid, data, loading]);

  return [data, setData, loading];
}
