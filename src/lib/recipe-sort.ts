import type { Recipe, SortCriteria } from './types';
import { perServingMacros } from './serving-utils';
import { normalizeText } from './utils';

// Macro sort criteria operate on PER-SERVING values, matching what the cards
// display (a 4-serving batch is not "high calorie" per plate).
const MACRO_SORT_KEYS = ['calories', 'protein', 'carbs', 'fat'] as const;
type MacroSortKey = typeof MACRO_SORT_KEYS[number];

export const RECIPE_SORT_OPTIONS: { value: SortCriteria; label: string }[] = [
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
