import { collection, deleteDoc, doc, runTransaction, setDoc } from 'firebase/firestore';

import { firestore } from '@/firebase';
import { DAY_ORDER, INITIAL_WEEK_PLAN } from '@/lib/data';
import type { DayPlan, Recipe, RecipeInstance, ShoppingListItem, WeekHistoryEntry } from '@/lib/types';

/** Hermes no garantiza crypto.randomUUID — id corto suficiente para instancias. */
function newInstanceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Transacción por día, mismo contrato que la web (firestore-operations.ts):
 * lee el doc del día (o el esqueleto inicial), aplica el modificador y guarda.
 */
export async function updateDayPlan(
  userId: string,
  day: string,
  modifierFn: (dayPlan: DayPlan) => DayPlan
): Promise<void> {
  const dayDocRef = doc(firestore, 'users', userId, 'weekPlan', day);
  await runTransaction(firestore, async (transaction) => {
    const dayDoc = await transaction.get(dayDocRef);
    let current: DayPlan;
    if (!dayDoc.exists()) {
      const initial = INITIAL_WEEK_PLAN.find((d) => d.day === day);
      if (!initial) throw new Error('Invalid day');
      current = { ...initial, meals: initial.meals || [] };
    } else {
      current = dayDoc.data() as DayPlan;
    }
    const updated = modifierFn(current);
    if (!updated.meals) updated.meals = [];
    transaction.set(dayDocRef, updated, { merge: true });
  });
}

export function addRecipeToMeal(userId: string, day: string, mealId: string, recipe: Recipe, servings = 1) {
  const instance: RecipeInstance = { ...recipe, instanceId: newInstanceId(), servingsEaten: servings };
  return updateDayPlan(userId, day, (plan) => ({
    ...plan,
    meals: plan.meals.map((m) => (m.id === mealId ? { ...m, recipes: [...m.recipes, instance] } : m)),
  }));
}

export function removeRecipeFromMeal(userId: string, day: string, mealId: string, instanceId: string) {
  return updateDayPlan(userId, day, (plan) => ({
    ...plan,
    meals: plan.meals.map((m) =>
      m.id === mealId ? { ...m, recipes: m.recipes.filter((r) => r.instanceId !== instanceId) } : m
    ),
  }));
}

export function updateServings(userId: string, day: string, mealId: string, instanceId: string, servings: number) {
  return updateDayPlan(userId, day, (plan) => ({
    ...plan,
    meals: plan.meals.map((m) =>
      m.id === mealId
        ? { ...m, recipes: m.recipes.map((r) => (r.instanceId === instanceId ? { ...r, servingsEaten: servings } : r)) }
        : m
    ),
  }));
}

export function clearMeal(userId: string, day: string, mealId: string) {
  return updateDayPlan(userId, day, (plan) => ({
    ...plan,
    meals: plan.meals.map((m) => (m.id === mealId ? { ...m, recipes: [] } : m)),
  }));
}

export function clearDay(userId: string, day: string) {
  return updateDayPlan(userId, day, (plan) => ({
    ...plan,
    meals: plan.meals.map((m) => ({ ...m, recipes: [] })),
  }));
}

/** La lista de la compra vive en el doc de perfil, como en la web. */
export function saveShoppingList(userId: string, items: ShoppingListItem[]) {
  return setDoc(doc(firestore, 'users', userId), { shoppingList: items }, { merge: true });
}

export async function saveWeekSnapshot(userId: string, label: string, days: DayPlan[]): Promise<string> {
  const ref = doc(collection(firestore, 'users', userId, 'weekHistory'));
  const entry: WeekHistoryEntry = {
    id: ref.id,
    savedAt: Date.now(),
    label,
    days: JSON.parse(JSON.stringify(days)),
  };
  await setDoc(ref, entry);
  return ref.id;
}

export function deleteWeekSnapshot(userId: string, snapshotId: string) {
  return deleteDoc(doc(firestore, 'users', userId, 'weekHistory', snapshotId));
}

export async function clearWeek(userId: string) {
  await Promise.all(DAY_ORDER.map((day) => clearDay(userId, day)));
}

/** Restaurar una semana guardada: reescribe los 7 días del plan vivo. */
export async function restoreWeek(userId: string, days: DayPlan[]) {
  await Promise.all(days.map((d) => updateDayPlan(userId, d.day, () => JSON.parse(JSON.stringify(d)))));
}
