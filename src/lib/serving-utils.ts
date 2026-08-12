import { MAX_PLATES_PER_SLOT, PORTION_FACTOR_MAX, PORTION_FACTOR_MIN, REFERENCE_DAILY_KCAL } from './constants';
import { scaleBatchMacros } from './portion-scaling';
import type { GoalMacros, Macros, MealCategory, Recipe, RecipeInstance, UserProfile } from './types';

/**
 * Las tres palancas de las raciones, cada una con UN trabajo:
 *
 *   1. `Recipe.servings` — cuánto rinde el lote. Propiedad de la receta.
 *   2. `portion`         — cómo de grande es un plato PARA TI. Del usuario.
 *   3. `plates`          — cuántos platos. Del hueco del plan. Entero.
 *
 *       macros = (totales / servings) × portion × plates
 *
 * Antes esto era un solo número (`servingsEaten`) que intentaba ser (2) y (3) a
 * la vez, con enteros: por eso un yogur de 60 kcal entraba «×12» en un almuerzo
 * y por eso el botón − bajaba a 0,1. Separadas, cada una es trivial.
 */

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

/** El rinde de la receta, con 1 de respaldo. */
export function batchServings(recipe: Pick<Recipe, 'servings'>): number {
  return recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
}

// ── Factor de ración (del usuario) ───────────────────────────────────────────

/**
 * Cómo de grande es un plato para quien tiene este objetivo, comparado con la
 * persona de referencia para la que está escrito el recetario de Nutrilp.
 *
 * Es lo que hace que la misma receta le sirva a alguien de 2900 kcal y a alguien
 * de 1900 sin tener que escribirla dos veces: el primero la ve al 145% y la
 * segunda al 95%. Se recorta a la horquilla razonable — más allá, lo correcto
 * es cambiar de plato o añadir un acompañamiento, no inflar este.
 */
export function portionFactorFromGoal(goalCalories: number | null | undefined): number {
  if (!goalCalories || goalCalories <= 0) return 1;
  return clampPortionFactor(goalCalories / REFERENCE_DAILY_KCAL);
}

export function clampPortionFactor(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(PORTION_FACTOR_MAX, Math.max(PORTION_FACTOR_MIN, Math.round(n * 100) / 100));
}

/**
 * El factor que toca aplicar a este usuario: el que haya puesto a mano, y si no
 * el que sale de su objetivo. Uno u otro, nunca los dos — con dos verdades,
 * cambiar de objetivo dejaría el ajuste manual mintiendo en silencio.
 */
export function portionFactorFor(
  profile: Pick<UserProfile, 'portionFactor'> | null | undefined,
  goal: GoalMacros | null | undefined
): number {
  if (profile?.portionFactor) return clampPortionFactor(profile.portionFactor);
  return portionFactorFromGoal(goal?.calories);
}

/**
 * El factor que le toca a ESTA receta. Solo se redimensiona el recetario de
 * Nutrilp: las recetas del usuario (propias o importadas) ya están escritas con
 * sus porciones, y estirarlas sería cambiarle lo que escribió.
 */
export function portionFor(recipe: Pick<Recipe, 'origin'>, userFactor: number): number {
  return recipe.origin === 'nutrilp' ? userFactor : 1;
}

/** «al 145%» — cómo se enseña el factor en la interfaz. */
export function formatPortionFactor(factor: number): string {
  return `${Math.round(factor * 100)}%`;
}

// ── Platos (del hueco) ───────────────────────────────────────────────────────

/** Entero, nunca menos de uno y nunca más del tope. Quitar es la X, no el −. */
export function clampPlates(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_PLATES_PER_SLOT, Math.max(1, Math.round(n)));
}

/**
 * Cuántos platos de `recipe` cubren `targetCalories`, ya contando el tamaño de
 * plato del usuario. Con tope: pasado de ahí no es una comida, es un reto —
 * antes esto no tenía límite y metía «12 raciones» de un yogur.
 */
export function fitPlates(
  recipe: Pick<Recipe, 'calories' | 'servings' | 'origin' | 'fixedMacros' | 'protein' | 'carbs' | 'fat'>,
  targetCalories: number | null | undefined,
  userFactor: number
): number {
  if (!targetCalories || targetCalories <= 0) return 1;
  const perPlate = platePreviewCalories(recipe, userFactor);
  if (!Number.isFinite(perPlate) || perPlate <= 0) return 1;
  return clampPlates(targetCalories / perPlate);
}

/**
 * Cómo entra una receta en un hueco: cuántos platos y de qué tamaño.
 *
 * **Único sitio donde se decide esto.** Antes cada camino lo resolvía por su
 * cuenta —la web con un cálculo sin tope, la app metiendo siempre 1, el
 * asistente con un tercero—, así que la misma receta entraba distinta según por
 * dónde la añadieras. Todo lo que coloca en el plan pasa por aquí.
 */
export function placementFor(
  recipe: Pick<Recipe, 'calories' | 'servings' | 'origin' | 'fixedMacros' | 'protein' | 'carbs' | 'fat'>,
  mealTypes: MealCategory[] | undefined,
  goal: GoalMacros | null | undefined,
  userFactor: number
): { plates: number; portion: number } {
  const target = goal ? goal.calories * mealCalorieRatio(mealTypes ?? []) : null;
  return {
    plates: fitPlates(recipe, target, userFactor),
    portion: portionFor(recipe, userFactor),
  };
}

/**
 * UN plato de esta receta, ya al tamaño de este usuario. Es la unidad en la que
 * razona todo lo que decide cuánto poner: si el ajuste se hiciera con el plato
 * "de referencia" y se corrigiera después, el resultado se saldría del margen.
 */
export function plateMacros(
  recipe: Pick<Recipe, 'calories' | 'servings' | 'origin' | 'fixedMacros' | 'protein' | 'carbs' | 'fat'>,
  userFactor: number
): Macros {
  const scaled = scaleBatchMacros(recipe, portionFor(recipe, userFactor));
  const s = batchServings(recipe);
  return {
    calories: scaled.calories / s,
    protein: scaled.protein / s,
    carbs: scaled.carbs / s,
    fat: scaled.fat / s,
  };
}

/** Calorías de UN plato de esta receta para este usuario. */
export function platePreviewCalories(
  recipe: Pick<Recipe, 'calories' | 'servings' | 'origin' | 'fixedMacros' | 'protein' | 'carbs' | 'fat'>,
  userFactor: number
): number {
  return plateMacros(recipe, userFactor).calories;
}

// ── Lectura de una instancia del plan (con compatibilidad) ───────────────────

type LegacyInstance = Pick<RecipeInstance, 'plates' | 'portion' | 'servingsEaten'>;

/**
 * Las instancias guardadas antes del rediseño solo tienen `servingsEaten`, que
 * era platos y tamaño de plato a la vez. Se reparte en los dos campos de forma
 * que **`plates × portion` sigue valiendo lo mismo**, así que nadie ve cambiar
 * las calorías de su plan al desplegar esto:
 *
 *   `2`   → 2 platos de tamaño 1        (el caso normal, exacto)
 *   `0,5` → 1 plato de medio tamaño
 *   `12`  → 3 platos de tamaño 4        (los «×12» del bug viejo: el número se
 *                                        conserva, pero ya se ve y se arregla)
 */
function legacySplit(instance: LegacyInstance): { plates: number; portion: number } {
  const eaten = instance.servingsEaten ?? 1;
  const plates = clampPlates(eaten);
  return { plates, portion: eaten / plates };
}

export function instancePlates(instance: LegacyInstance): number {
  if (instance.plates != null) return clampPlates(instance.plates);
  return legacySplit(instance).plates;
}

export function instancePortion(instance: LegacyInstance): number {
  if (instance.portion != null) return instance.portion;
  // Con `plates` puesto ya es una instancia nueva: le falta el tamaño, no hay
  // nada viejo que repartir. Sin esta salida, el reparto de abajo devolvería
  // `1/plates` y encogería el plato.
  if (instance.plates != null) return 1;
  return legacySplit(instance).portion;
}

/** Lo que este hueco aporta al día: el lote a su tamaño, por plato, por platos. */
export function effectiveMacros(instance: RecipeInstance): Macros {
  const scaled = scaleBatchMacros(instance, instancePortion(instance));
  const per = instancePlates(instance) / batchServings(instance);
  return {
    calories: scaled.calories * per,
    protein: scaled.protein * per,
    carbs: scaled.carbs * per,
    fat: scaled.fat * per,
  };
}

// ── Reparto del objetivo entre las comidas del día ───────────────────────────

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

// ── Raciones a cocinar (modo cocina) ─────────────────────────────────────────
// Esto NO es el plan: es "cuánto voy a preparar ahora", y ahí media ración de un
// lote de cuatro sí es un caso real, así que aquí sí se admiten fracciones.

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

/** «1 plato», «2 platos». */
export function platesLabel(n: number): string {
  return `${n} ${n === 1 ? 'plato' : 'platos'}`;
}
