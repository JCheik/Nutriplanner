import { collection, doc, query, setDoc, where } from 'firebase/firestore';
import { useCallback, useMemo } from 'react';

import { firestore } from '@/firebase';
import { useAuthUser } from '@/firebase/auth-context';
import { useCollection } from '@/firebase/firestore-hooks';
import type { DiaryDay, DiaryEntry, RecipeInstance } from '@/lib/types';

/** Local calendar date as YYYY-MM-DD (never UTC — meals belong to local days). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The 7 calendar dates of the CURRENT week, Monday-first — index i matches
 * DAY_ORDER[i]. Same contract as the web's use-diary.ts.
 */
export function currentWeekDateKeys(): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateKey(d);
  });
}

function newEntryId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * "Lo he comido" del planificador, con el contrato EXACTO de la web
 * (useWeekDiary): marcar una receta planificada snapshotea sus macros
 * escalados como entrada del diario de esa fecha (source 'plan' +
 * planInstanceId); desmarcar filtra esa entrada. Un doc por día:
 * users/{uid}/diary/{YYYY-MM-DD} = { date, entries[] }.
 */
export function useWeekDiary() {
  const { user } = useAuthUser();
  const weekKeys = useMemo(() => currentWeekDateKeys(), []);

  const weekQuery = useMemo(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'diary'),
            where('date', '>=', weekKeys[0]),
            where('date', '<=', weekKeys[6])
          )
        : null,
    [user, weekKeys]
  );
  const { data: weekDays } = useCollection<DiaryDay>(weekQuery);

  const diaryByDate = useMemo(() => new Map((weekDays ?? []).map((d) => [d.date, d])), [weekDays]);

  const writeEntries = useCallback(
    async (dateKey: string, entries: DiaryEntry[]) => {
      if (!user) return;
      await setDoc(doc(firestore, 'users', user.uid, 'diary', dateKey), { date: dateKey, entries }, { merge: true });
    },
    [user]
  );

  /** True si esa receta planificada ya está registrada como comida en esa fecha. */
  const isEaten = useCallback(
    (dateKey: string, planInstanceId: string) =>
      (diaryByDate.get(dateKey)?.entries ?? []).some((e) => e.planInstanceId === planInstanceId),
    [diaryByDate]
  );

  const logPlanRecipe = useCallback(
    (dateKey: string, recipe: RecipeInstance) => {
      const servingsEaten = recipe.servingsEaten ?? 1;
      const scale = servingsEaten / (recipe.servings ?? 1);
      const entry: DiaryEntry = {
        id: newEntryId(),
        name: recipe.name,
        calories: recipe.calories * scale,
        protein: recipe.protein * scale,
        carbs: recipe.carbs * scale,
        fat: recipe.fat * scale,
        quantityLabel: `${servingsEaten} rac`,
        source: 'plan',
        planInstanceId: recipe.instanceId,
        loggedAt: Date.now(),
      };
      const existing = diaryByDate.get(dateKey)?.entries ?? [];
      return writeEntries(dateKey, [...existing, entry]);
    },
    [diaryByDate, writeEntries]
  );

  const unlogPlanRecipe = useCallback(
    (dateKey: string, planInstanceId: string) => {
      const existing = diaryByDate.get(dateKey)?.entries ?? [];
      return writeEntries(dateKey, existing.filter((e) => e.planInstanceId !== planInstanceId));
    },
    [diaryByDate, writeEntries]
  );

  /** Macros ya comidos (todas las fuentes) de esa fecha — alimenta el anillo. */
  const eatenTotals = useCallback(
    (dateKey: string) =>
      (diaryByDate.get(dateKey)?.entries ?? []).reduce(
        (acc, e) => {
          acc.calories += e.calories;
          acc.protein += e.protein;
          acc.carbs += e.carbs;
          acc.fat += e.fat;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [diaryByDate]
  );

  return { weekKeys, isEaten, logPlanRecipe, unlogPlanRecipe, eatenTotals };
}
