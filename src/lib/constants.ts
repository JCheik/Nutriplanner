/**
 * Shared constants safe to import from both client and server code.
 * Keep this module free of server-only imports (e.g. firebase-admin) so it can
 * be bundled on the client without leaking the Admin SDK.
 */

/**
 * Superuser email that is always treated as an admin, even without the custom
 * `admin` claim. Must stay in sync with the value hardcoded in firestore.rules
 * (Firestore rules cannot import TypeScript).
 */
export const SUPERUSER_EMAIL = 'jonicheik@gmail.com';

/**
 * Meal categories used to tag recipes and meal-plan slots. They act as a GUIDE
 * for the AI autocomplete (it only assigns recipes whose category matches the
 * slot's mealType, or category-less "comodín" recipes). Manual assignment by the
 * user is never restricted by these.
 *
 * Single source of truth for both client components and server AI flows.
 * The string literals here must stay in sync with the `MealCategory` type in
 * `src/lib/types.ts`.
 */
export const MEAL_CATEGORIES = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'merienda', label: 'Merienda' },
  { value: 'cena', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
  { value: 'postre', label: 'Postre' },
  { value: 'otro', label: 'Otro' },
] as const;

export const MEAL_CATEGORY_VALUES = MEAL_CATEGORIES.map(c => c.value);

export const MEAL_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  MEAL_CATEGORIES.map(c => [c.value, c.label])
);

/**
 * Diet tags a recipe can satisfy. Used by the AI autocomplete/chat to respect the
 * user's diet preference (e.g. only suggest vegan recipes). Empty on a recipe =
 * no dietary restriction. Single source of truth for client + server AI flows;
 * keep in sync with the `DietTag` type in `src/lib/types.ts`.
 */
export const DIET_TAGS = [
  { value: 'omnivora', label: 'Omnívora' },
  { value: 'vegetariana', label: 'Vegetariana' },
  { value: 'vegana', label: 'Vegana' },
  { value: 'keto', label: 'Keto' },
  { value: 'low_carb', label: 'Low carb' },
  { value: 'sin_gluten', label: 'Sin gluten' },
  { value: 'sin_lactosa', label: 'Sin lactosa' },
] as const;

export const DIET_TAG_VALUES = DIET_TAGS.map(d => d.value);

export const DIET_TAG_LABELS: Record<string, string> = Object.fromEntries(
  DIET_TAGS.map(d => [d.value, d.label])
);
