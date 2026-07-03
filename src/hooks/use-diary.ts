'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUser, useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, setDoc, deleteField } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { DiaryDay, DiaryEntry } from '@/lib/types';

/** Local calendar date as YYYY-MM-DD (never UTC — meals belong to local days). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const CHART_WINDOW_DAYS = 30;

/**
 * Food diary state: one Firestore doc per calendar day at
 * users/{uid}/diary/{YYYY-MM-DD} with the entries eaten that day and an
 * optional weigh-in. Also subscribes to the last 30 days for the progress
 * charts.
 */
export function useDiary() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));

  const dayRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid, 'diary', selectedDate) : null),
    [firestore, user, selectedDate]
  );
  const { data: day, isLoading: dayLoading } = useDoc<DiaryDay>(dayRef);

  // Rolling window for the progress charts. The cutoff is derived from the
  // day so the query reference stays stable within a calendar day.
  const chartCutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (CHART_WINDOW_DAYS - 1));
    return toDateKey(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toDateKey(new Date())]);

  const recentQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'diary'),
            where('date', '>=', chartCutoff),
            orderBy('date', 'asc')
          )
        : null,
    [firestore, user, chartCutoff]
  );
  const { data: recentDays, isLoading: recentLoading } = useCollection<DiaryDay>(recentQuery);

  const goDay = useCallback((deltaDays: number) => {
    setSelectedDate((prev) => {
      const d = dateKeyToDate(prev);
      d.setDate(d.getDate() + deltaDays);
      return toDateKey(d);
    });
  }, []);

  const goToday = useCallback(() => setSelectedDate(toDateKey(new Date())), []);

  const writeDay = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!dayRef) return;
      try {
        await setDoc(dayRef, { date: selectedDate, ...patch }, { merge: true });
      } catch (e) {
        console.error('Error saving diary day:', e);
        toast({
          variant: 'destructive',
          title: 'No se pudo guardar el diario',
          description: 'Revisa tu conexión e inténtalo de nuevo.',
        });
      }
    },
    [dayRef, selectedDate, toast]
  );

  const addEntry = useCallback(
    (entry: Omit<DiaryEntry, 'id' | 'loggedAt'>) => {
      const newEntry: DiaryEntry = {
        ...entry,
        id: self.crypto.randomUUID(),
        loggedAt: Date.now(),
      };
      // Firestore rejects `undefined` values — strip optional fields not set.
      if (newEntry.quantityLabel === undefined) delete newEntry.quantityLabel;
      const entries = [...(day?.entries ?? []), newEntry];
      return writeDay({ entries });
    },
    [day, writeDay]
  );

  const removeEntry = useCallback(
    (entryId: string) => {
      const entries = (day?.entries ?? []).filter((e) => e.id !== entryId);
      return writeDay({ entries });
    },
    [day, writeDay]
  );

  const setWeight = useCallback(
    (weightKg: number | null) =>
      writeDay({ weightKg: weightKg === null ? deleteField() : weightKg }),
    [writeDay]
  );

  const totals = useMemo(() => {
    return (day?.entries ?? []).reduce(
      (acc, e) => {
        acc.calories += e.calories;
        acc.protein += e.protein;
        acc.carbs += e.carbs;
        acc.fat += e.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [day]);

  return {
    selectedDate,
    setSelectedDate,
    goDay,
    goToday,
    isToday: selectedDate === toDateKey(new Date()),
    day,
    dayLoading,
    totals,
    recentDays: recentDays ?? [],
    recentLoading,
    addEntry,
    removeEntry,
    setWeight,
  };
}
