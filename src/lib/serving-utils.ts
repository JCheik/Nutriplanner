import type { MealCategory, Recipe } from './types';

/**
 * Macros for ONE serving of a recipe. Recipes store the totals of the whole
 * batch plus how many servings it yields; every user-facing card shows this
 * per-serving value so the numbers you see match what actually lands on a
 * plate when building the plan.
 */
export function perServingMacros(
  recipe: Pick<Recipe, 'calories' | 'protein' | 'carbs' | 'fat' | 'servings'>
): { servings: number; calories: number; protein: number; carbs: number; fat: number } {
  const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
  return {
    servings,
    calories: (recipe.calories || 0) / servings,
    protein: (recipe.protein || 0) / servings,
    carbs: (recipe.carbs || 0) / servings,
    fat: (recipe.fat || 0) / servings,
  };
}

/**
 * Por debajo de esto ya no es una ración. Se permite tan poco porque hay usos
 * legítimos: un chorrito de aceite, un par de nueces de un lote de veinte.
 */
export const MIN_SERVINGS = 0.1;

/** Recorta a un valor usable: nunca menos del mínimo y como mucho 2 decimales. */
export function clampServings(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(MIN_SERVINGS, Math.round(n * 100) / 100);
}

/** Con coma decimal y sin ceros de relleno: 1 → «1», 0,5 → «0,5», 1,25 → «1,25». */
export function formatServings(n: number): string {
  const v = Math.round((Number.isFinite(n) ? n : 1) * 100) / 100;
  return String(v).replace('.', ',');
}

/** Lo que teclea el usuario, aceptando coma o punto. `null` si no hay número. */
export function parseServings(text: string): number | null {
  const n = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) ? clampServings(n) : null;
}

/** «1 ración», «0,5 raciones», «2 raciones». */
export function servingsLabel(n: number): string {
  return `${formatServings(n)} ${n === 1 ? 'ración' : 'raciones'}`;
}

// Share of the daily calorie goal that a meal type represents. A slot can hold
// several meal types; size it by the most caloric one.
function ratioForType(type: MealCategory): number {
  switch (type) {
    case 'desayuno': return 0.25;
    case 'almuerzo': return 0.35;
    case 'cena': return 0.30;
    case 'merienda': return 0.10;
    case 'snack': return 0.10;
    case 'postre': return 0.10;
    default: return 0.25;
  }
}

export function mealCalorieRatio(mealTypes: MealCategory[]): number {
  if (!mealTypes || mealTypes.length === 0) return 0.25;
  return Math.max(...mealTypes.map(ratioForType));
}

/**
 * How many servings of `recipe` cover `targetCalories`, so two users with
 * different goals get different amounts of the same base recipe. Whole servings
 * only, never below 1 — "cómete 0.5 ensalada" isn't a realistic instruction, so
 * we round to the nearest full serving rather than fitting the calorie target
 * exactly. Falls back to 1 when there's no usable target.
 */
export function suggestedServings(
  recipe: Pick<Recipe, 'calories' | 'servings'>,
  targetCalories: number | null | undefined
): number {
  if (!targetCalories || targetCalories <= 0) return 1;
  const perServing = recipe.calories / (recipe.servings ?? 1);
  if (!Number.isFinite(perServing) || perServing <= 0) return 1;
  const rounded = Math.round(targetCalories / perServing);
  return Math.max(1, rounded);
}
