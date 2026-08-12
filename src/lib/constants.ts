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
 * Where the "Enviar feedback" button sends alpha testers' reports. Kept as a
 * mailto target (no backend needed for a closed alpha).
 */
export const FEEDBACK_EMAIL = 'jonicheik@gmail.com';

/**
 * APK que ofrece el aterrizaje móvil (`/mobile`). Hoy apunta al artefacto de
 * EAS del build interno; cuando la app esté en Google Play, sustituir por la
 * URL de la ficha de la tienda y ya está.
 *
 * ⚠️ **Cada compilación nueva cambia esta URL** — el artefacto lleva un hash.
 * Si se compila y no se actualiza aquí, la web sigue repartiendo la versión
 * vieja (pasó con la 0.3.0). Versión actual: **0.5.0**.
 *
 * ⚠️ Es una página pública: cualquiera que llegue a nutrilp.com desde un móvil
 * puede descargarlo. Asumido mientras el registro también sea abierto.
 */
export const APK_DOWNLOAD_URL =
  'https://expo.dev/artifacts/eas/bQZHJNwpn1oqr9OQ4s-6N3gRJqUnNkMtUs561nTDo6Q.apk';

/**
 * Tamaño de persona para el que está escrito el recetario de Nutrilp.
 *
 * Las recetas del catálogo se escriben UNA vez, con cantidades absolutas, pero
 * las comen personas muy distintas: con la fórmula de la calculadora, un hombre
 * de 90 kg/1,80 mantiene con ~2900 kcal y una mujer de 55 kg/1,58 con ~1900 —
 * un factor de 1,5 entre los dos. Declarando aquí para quién están escritas, la
 * app puede servirlas al tamaño de quien las mira (ver `portionFactorFromGoal`).
 *
 * 2000 kcal/día es la referencia del etiquetado nutricional europeo. Se eligió
 * por eso: es un número estándar y no obliga a re-medir el catálogo.
 */
export const REFERENCE_DAILY_KCAL = 2000;

/**
 * Topes del factor de ración. Fuera de esta horquilla es mejor que el plan
 * añada (o quite) un acompañamiento que inflar o encoger un plato hasta lo
 * absurdo: nadie sirve el triple de una lasaña en el mismo plato.
 */
export const PORTION_FACTOR_MIN = 0.6;
export const PORTION_FACTOR_MAX = 1.8;

/**
 * Platos como mucho de UN mismo sitio en un hueco. Más que esto no es una
 * comida, es un reto. El ajuste fino lo hace el factor de ración, no repetir.
 */
export const MAX_PLATES_PER_SLOT = 3;

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
