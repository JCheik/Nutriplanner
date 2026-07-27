import { collection, doc } from 'firebase/firestore';
import { useMemo } from 'react';

import { firestore } from '@/firebase';
import { useAuthUser } from '@/firebase/auth-context';
import { useCollection, useDoc } from '@/firebase/firestore-hooks';
import { DAY_ORDER, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { DayPlan, GoalMacros, Recipe, UserProfile, WeekPlan } from '@/lib/types';

/**
 * Read-side data hooks for F1 (mirror of the web's use-week-plan-state /
 * use-recipe-state / use-user-profile-state, reads only — writes land in F2).
 */

export function useWeekPlan(): { weekPlan: WeekPlan; loading: boolean } {
  const { user } = useAuthUser();
  const ref = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'weekPlan') : null),
    [user]
  );
  const { data, loading } = useCollection<DayPlan>(ref);

  // Firestore stores one doc per day, in arbitrary order and possibly missing
  // days — normalize to the fixed Monday-first week like the web does.
  const weekPlan = useMemo(() => {
    if (!data) return INITIAL_WEEK_PLAN;
    const byDay = new Map(data.map((d) => [d.day, d]));
    return DAY_ORDER.map((dayName, i) => {
      const stored = byDay.get(dayName);
      return stored && Array.isArray(stored.meals) ? { day: dayName, meals: stored.meals } : INITIAL_WEEK_PLAN[i];
    });
  }, [data]);

  return { weekPlan, loading };
}

export function useRecipes() {
  const { user } = useAuthUser();
  const userRef = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'recipes') : null),
    [user]
  );
  const globalRef = useMemo(() => (user ? collection(firestore, 'nutriplanner_recipes') : null), [user]);
  const { data: userRecipes, loading: userLoading } = useCollection<Recipe>(userRef);
  const { data: globalRecipes, loading: globalLoading } = useCollection<Recipe>(globalRef);

  return {
    userRecipes: userRecipes ?? [],
    globalRecipes: globalRecipes ?? [],
    loading: userLoading || globalLoading,
  };
}

export function useProfile() {
  const { user } = useAuthUser();
  const ref = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user]);
  const { data: profile, loading } = useDoc<UserProfile>(ref);

  // Same fallback chain as the web: saved preference, else maintenance.
  const activeGoalMacros: GoalMacros | null = useMemo(() => {
    const result = profile?.calorieResult;
    if (!result) return null;
    const pref = profile?.activeGoalPreference ?? 'maintenance';
    return result[pref] ?? result.maintenance ?? null;
  }, [profile]);

  return { profile, activeGoalMacros, loading };
}
