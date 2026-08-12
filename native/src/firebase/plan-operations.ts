import { collection, deleteDoc, doc, runTransaction, setDoc } from 'firebase/firestore';

import { firestore } from '@/firebase';
import { DAY_ORDER, INITIAL_WEEK_PLAN } from '@/lib/data';
import { clampPlates, instancePortion } from '@/lib/serving-utils';
import type { DayPlan, Meal, Recipe, RecipeInstance, ShoppingListItem, WeekHistoryEntry } from '@/lib/types';

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

/**
 * Coloca una receta en un hueco. `plates` es lo que el usuario ve y toca;
 * `portion` es el tamaño de plato con el que se colocó, y se guarda en la
 * instancia para que cambiar de objetivo no reescriba lo ya planificado.
 * Los dos salen de `placementFor`, igual que en la web.
 */
export function addRecipeToMeal(
  userId: string,
  day: string,
  mealId: string,
  recipe: Recipe,
  plates = 1,
  portion = 1
) {
  const instance: RecipeInstance = { ...recipe, instanceId: newInstanceId(), plates, portion };
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

/**
 * Cambia cuántos platos hay en un hueco. Al escribir se fija también el
 * `portion` heredado y se borra el `servingsEaten` viejo: la instancia queda ya
 * en el modelo nuevo sin cambiar de calorías por el camino.
 */
export function updatePlates(userId: string, day: string, mealId: string, instanceId: string, plates: number) {
  return updateDayPlan(userId, day, (plan) => ({
    ...plan,
    meals: plan.meals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            recipes: m.recipes.map((r) => {
              if (r.instanceId !== instanceId) return r;
              const { servingsEaten: _legacy, ...rest } = r;
              return { ...rest, plates: clampPlates(plates), portion: instancePortion(r) };
            }),
          }
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

/**
 * Pegar un día copiado en otro: SUSTITUYE lo que hubiera en el destino (es lo
 * que se espera de "copiar el lunes al martes"). Los huecos se emparejan por
 * título ("Desayuno" con "Desayuno"), no por id, porque los ids llevan el día
 * dentro (`m-0-lunes`). Cada receta pegada estrena `instanceId`: dos huecos
 * nunca pueden compartir instancia.
 */
export function pasteDayInto(userId: string, targetDay: string, sourceMeals: Meal[]) {
  return updateDayPlan(userId, targetDay, (plan) => ({
    ...plan,
    meals: plan.meals.map((m, i) => {
      const source = sourceMeals.find((s) => s.title === m.title) ?? sourceMeals[i];
      if (!source) return { ...m, recipes: [] };
      return { ...m, recipes: source.recipes.map((r) => ({ ...r, instanceId: newInstanceId() })) };
    }),
  }));
}

/** Pegar las recetas copiadas de un hueco en otro: se AÑADEN a lo que ya haya. */
export function pasteRecipesIntoMeal(userId: string, day: string, mealId: string, recipes: RecipeInstance[]) {
  return updateDayPlan(userId, day, (plan) => ({
    ...plan,
    meals: plan.meals.map((m) =>
      m.id === mealId
        ? { ...m, recipes: [...m.recipes, ...recipes.map((r) => ({ ...r, instanceId: newInstanceId() }))] }
        : m
    ),
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
