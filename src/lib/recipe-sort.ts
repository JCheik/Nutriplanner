import type { Recipe, SortCriteria } from './types';
import { perServingMacros } from './serving-utils';
import { normalizeText } from './utils';

// Macro sort criteria operate on PER-SERVING values, matching what the cards
// display (a 4-serving batch is not "high calorie" per plate).
const MACRO_SORT_KEYS = ['calories', 'protein', 'carbs', 'fat'] as const;
type MacroSortKey = typeof MACRO_SORT_KEYS[number];

export const RECIPE_SORT_OPTIONS: { value: SortCriteria; label: string }[] = [
  // La primera a propósito: "¿cuál acabo de añadir?" es la pregunta más
  // frecuente en un recetario de 130, y sin esto no había forma de responderla.
  // Las recetas sin `createdAt` (las de antes del campo) caen al final solas,
  // porque `compareRecipes` manda los undefined al fondo.
  { value: 'createdAt-desc', label: 'Añadidas recientemente' },
  { value: 'name-asc', label: 'Nombre (A-Z)' },
  { value: 'name-desc', label: 'Nombre (Z-A)' },
  { value: 'calories-asc', label: 'Calorías (Bajas a Altas)' },
  { value: 'calories-desc', label: 'Calorías (Altas a Bajas)' },
  { value: 'protein-asc', label: 'Proteína (Baja a Alta)' },
  { value: 'protein-desc', label: 'Proteína (Alta a Baja)' },
  { value: 'carbs-asc', label: 'Carbs (Bajos a Altos)' },
  { value: 'carbs-desc', label: 'Carbs (Altos a Bajos)' },
  { value: 'fat-asc', label: 'Grasa (Baja a Alta)' },
  { value: 'fat-desc', label: 'Grasa (Alta a Baja)' },
];

/**
 * Cuánto dura el cartel de "Nueva": una semana. Lo justo para volver al día
 * siguiente y reconocer lo que importaste, sin llenar el recetario de etiquetas.
 */
const NUEVA_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * ¿Se añadió hace poco? Las recetas anteriores al campo `createdAt` nunca lo
 * son, que es lo correcto: son justamente el montón entre el que hay que
 * distinguir la recién llegada.
 */
export function isRecentRecipe(recipe: Recipe, now = Date.now()): boolean {
  if (!recipe.createdAt) return false;
  const t = Date.parse(recipe.createdAt);
  return Number.isFinite(t) && now - t < NUEVA_MS;
}

function sortableValue(recipe: Recipe, key: keyof Recipe): string | number | undefined {
  if ((MACRO_SORT_KEYS as readonly string[]).includes(key as string)) {
    return perServingMacros(recipe)[key as MacroSortKey];
  }
  const v = recipe[key];
  return typeof v === 'string' || typeof v === 'number' ? v : undefined;
}

/** Comparator for `Array.prototype.sort` implementing a `SortCriteria`. */
export function compareRecipes(sortCriteria: SortCriteria) {
  const [key, order] = sortCriteria.split('-') as [keyof Recipe, 'asc' | 'desc'];
  return (a: Recipe, b: Recipe): number => {
    let valA = sortableValue(a, key);
    let valB = sortableValue(b, key);

    if (typeof valA === 'string' && typeof valB === 'string') {
      valA = normalizeText(valA);
      valB = normalizeText(valB);
    }

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  };
}
