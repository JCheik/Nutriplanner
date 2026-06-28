'use client';

import { useCallback, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useUser, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { saveWeekSnapshot, deleteWeekSnapshot } from '@/firebase/firestore-operations';
import type { DayPlan, WeekHistoryEntry } from '@/lib/types';

/**
 * Reads and mutates the user's archived week snapshots
 * (users/{uid}/weekHistory). The live planner stays a single rolling week;
 * this hook lets the user save the current week and browse/restore past ones.
 */
export function useWeekHistory() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const historyRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'users', user.uid, 'weekHistory') : null),
    [firestore, user]
  );
  const { data, isLoading } = useCollection<WeekHistoryEntry>(historyRef);

  // Newest first.
  const history = useMemo(
    () => (data ? [...data].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0)) : []),
    [data]
  );

  const saveCurrentWeek = useCallback(
    async (label: string, days: DayPlan[]) => {
      if (!user || !firestore) return;
      await saveWeekSnapshot(firestore, user.uid, label, days);
    },
    [user, firestore]
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!user || !firestore) return;
      await deleteWeekSnapshot(firestore, user.uid, snapshotId);
    },
    [user, firestore]
  );

  return { history, isLoading, saveCurrentWeek, deleteSnapshot };
}
