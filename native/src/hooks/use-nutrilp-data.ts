import { collection, doc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { firestore } from '@/firebase';
import { useAuthUser } from '@/firebase/auth-context';
import { useCollection, useDoc } from '@/firebase/firestore-hooks';
import { DAY_ORDER, INITIAL_WEEK_PLAN } from '@/lib/data';
import { readCache, writeCache } from '@/lib/offline-cache';
import type { DayPlan, GoalMacros, Recipe, UserProfile, WeekPlan } from '@/lib/types';

/**
 * Lecturas de datos, espejo de los hooks de la web.
 *
 * Todas pasan por la caché de `offline-cache.ts`: lo último que llegó de
 * Firestore se guarda en el disco y se sirve mientras no haya respuesta en
 * vivo. Sin eso, en el súper sin cobertura la app se quedaba vacía — que es
 * justo el momento en que hace falta la lista de la compra.
 */

/**
 * Devuelve el valor en vivo si ya llegó y, si no, lo último cacheado.
 * `fromCache` sirve para avisar en pantalla de que puede estar desactualizado.
 */
function useCached<T>(name: string, uid: string | undefined, live: T | null): { value: T | null; fromCache: boolean } {
  const [cached, setCached] = useState<T | null>(null);

  useEffect(() => {
    let alive = true;
    readCache<T>(name, uid).then((v) => {
      if (alive) setCached(v);
    });
    return () => {
      alive = false;
    };
  }, [name, uid]);

  useEffect(() => {
    if (live) writeCache(name, uid, live);
  }, [name, uid, live]);

  return { value: live ?? cached, fromCache: !live && cached !== null };
}

export function useWeekPlan(): { weekPlan: WeekPlan; loading: boolean; fromCache: boolean } {
  const { user } = useAuthUser();
  const ref = useMemo(() => (user ? collection(firestore, 'users', user.uid, 'weekPlan') : null), [user]);
  const { data, loading } = useCollection<DayPlan>(ref);
  const { value, fromCache } = useCached<DayPlan[]>('weekPlan', user?.uid, data);

  // Firestore guarda un doc por día, en orden arbitrario y con días posiblemente
  // ausentes — se normaliza a la semana fija de lunes a domingo, como la web.
  const weekPlan = useMemo(() => {
    if (!value) return INITIAL_WEEK_PLAN;
    const byDay = new Map(value.map((d) => [d.day, d]));
    return DAY_ORDER.map((dayName, i) => {
      const stored = byDay.get(dayName);
      return stored && Array.isArray(stored.meals) ? { day: dayName, meals: stored.meals } : INITIAL_WEEK_PLAN[i];
    });
  }, [value]);

  return { weekPlan, loading: loading && !fromCache, fromCache };
}

export function useRecipes() {
  const { user } = useAuthUser();
  const userRef = useMemo(() => (user ? collection(firestore, 'users', user.uid, 'recipes') : null), [user]);
  const globalRef = useMemo(() => (user ? collection(firestore, 'nutriplanner_recipes') : null), [user]);
  const { data: userRecipes, loading: userLoading } = useCollection<Recipe>(userRef);
  const { data: globalRecipes, loading: globalLoading } = useCollection<Recipe>(globalRef);

  const mine = useCached<Recipe[]>('userRecipes', user?.uid, userRecipes);
  const global = useCached<Recipe[]>('globalRecipes', user?.uid, globalRecipes);

  return {
    userRecipes: mine.value ?? [],
    globalRecipes: global.value ?? [],
    loading: (userLoading || globalLoading) && !mine.fromCache && !global.fromCache,
    fromCache: mine.fromCache || global.fromCache,
  };
}

export function useProfile() {
  const { user } = useAuthUser();
  const ref = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user]);
  const { data, loading } = useDoc<UserProfile>(ref);
  const { value: profile, fromCache } = useCached<UserProfile>('profile', user?.uid, data);

  // Misma cadena de respaldo que la web: preferencia guardada, si no mantenimiento.
  const activeGoalMacros: GoalMacros | null = useMemo(() => {
    const result = profile?.calorieResult;
    if (!result) return null;
    const pref = profile?.activeGoalPreference ?? 'maintenance';
    return result[pref] ?? result.maintenance ?? null;
  }, [profile]);

  return { profile, activeGoalMacros, loading: loading && !fromCache, fromCache };
}
