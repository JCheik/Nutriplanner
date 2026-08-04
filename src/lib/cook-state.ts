import { normalizeText } from '@/lib/utils';
import type { BaseIngredient } from '@/lib/types';

/**
 * Detecta alimentos del catálogo que NO dicen si están crudos o cocidos, y para
 * los que eso cambia los macros muchísimo.
 *
 * El arroz, la pasta y las legumbres triplican su peso al cocerse: 100 g de
 * arroz crudo son ~350 kcal, y los mismos 100 g ya cocidos, ~130. Un catálogo
 * con "Arroz blanco" a secas es una trampa — quien pese arroz cocido y elija esa
 * entrada se apunta casi el triple de calorías. Pasó de verdad en una receta de
 * usuario, y de ahí sale esta comprobación.
 *
 * La prevención vive en `ai/prompt-fragments.ts` (COOK_STATE_RULE); esto es para
 * limpiar lo que ya estaba guardado.
 */

/** Raíces de alimentos cuyo peso y densidad calórica cambian al cocerse. */
const STATE_DEPENDENT = [
  'arroz', 'pasta', 'macarron', 'espagueti', 'espagueti', 'tallarin', 'fideo', 'penne', 'fusilli',
  'lasana', 'canelon', 'cuscus', 'quinoa', 'bulgur', 'mijo', 'cebada', 'espelta', 'avena', 'trigo',
  'lenteja', 'garbanzo', 'alubia', 'judia', 'frijol', 'haba', 'guisante seco', 'soja texturizada',
];

/** Si el nombre ya lleva una de estas, no hay ambigüedad que resolver. */
const STATE_WORDS = [
  'crudo', 'cruda', 'crudos', 'crudas', 'seco', 'seca', 'secos', 'secas',
  'cocido', 'cocida', 'cocidos', 'cocidas', 'cocinado', 'cocinada', 'hervido', 'hervida',
  'en conserva', 'precocido', 'precocida', 'escurrido', 'escurrida', 'al dente',
];

/**
 * Palabras que convierten la raíz en OTRO alimento, que no se cuece ni se pesa
 * en dos estados: la harina de avena o la leche de arroz no son ambiguas.
 */
const NOT_AMBIGUOUS_IF_CONTAINS = [
  'harina', 'copos', 'salvado', 'leche', 'bebida', 'vinagre', 'tortita', 'galleta', 'pan ',
  'salsa', 'aceite', 'crema', 'yogur', 'tofu', 'tempeh', 'miso', 'sirope', 'hinchado', 'inflado',
  'barrita', 'snack', 'nata', 'postre', 'cerveza', 'proteina',
];

/** Umbrales para adivinar el estado a partir de las kcal/100 g. */
const DRY_MIN_KCAL = 250;
const COOKED_MAX_KCAL = 200;

export type CookStateGuess = 'crudo' | 'cocido' | null;

export interface AmbiguousIngredient {
  ingredient: BaseIngredient;
  /** Lo que sugieren sus calorías; `null` si se queda en tierra de nadie. */
  guess: CookStateGuess;
}

/** ¿Este nombre necesita decir crudo/cocido y no lo dice? */
export function isAmbiguousCookState(name: string): boolean {
  const n = normalizeText(name);
  if (!n) return false;
  if (NOT_AMBIGUOUS_IF_CONTAINS.some((w) => n.includes(w))) return false;
  if (!STATE_DEPENDENT.some((w) => n.includes(w))) return false;
  return !STATE_WORDS.some((w) => n.includes(w));
}

/**
 * Adivina el estado por la densidad calórica. Entre los dos umbrales devuelve
 * `null` a propósito: es mejor no sugerir nada que sugerir mal en algo que
 * multiplica las calorías por tres.
 */
export function guessCookState(caloriesPer100g: number | undefined): CookStateGuess {
  if (!caloriesPer100g || caloriesPer100g <= 0) return null;
  if (caloriesPer100g >= DRY_MIN_KCAL) return 'crudo';
  if (caloriesPer100g <= COOKED_MAX_KCAL) return 'cocido';
  return null;
}

/** Los alimentos del catálogo que hay que revisar, con su sugerencia. */
export function findAmbiguousCookState(ingredients: BaseIngredient[]): AmbiguousIngredient[] {
  return ingredients
    .filter((i) => isAmbiguousCookState(i.name ?? ''))
    .map((i) => ({ ingredient: i, guess: guessCookState(i.calories) }));
}
