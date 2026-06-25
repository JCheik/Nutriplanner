import type { MealCategory, Recipe } from './types';

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
 * different goals get different amounts of the same base recipe. Rounded to the
 * nearest 0.25, never below 0.25. Falls back to 1 when there's no usable target.
 */
export function suggestedServings(
  recipe: Pick<Recipe, 'calories' | 'servings'>,
  targetCalories: number | null | undefined
): number {
  if (!targetCalories || targetCalories <= 0) return 1;
  const perServing = recipe.calories / (recipe.servings ?? 1);
  if (!Number.isFinite(perServing) || perServing <= 0) return 1;
  const rounded = Math.round((targetCalories / perServing) * 4) / 4;
  return Math.max(0.25, rounded);
}
