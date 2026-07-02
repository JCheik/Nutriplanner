/**
 * Smart classification of recipes into broad buckets (Desayunos / Almuerzos /
 * Meriendas / Cenas / Snacks / Postres / Otros) for grouping in the UI. Prefers
 * the recipe's explicit MealCategory and falls back to keyword matching on
 * name + ingredients. No Firestore reads/writes — pure functions, safe on
 * client and server.
 *
 * Single source of truth shared by the recipe library sidebar and the
 * "add recipe to a slot" selection dialog.
 */
import type { Recipe, MealCategory } from '@/lib/types';

export type SmartCategory =
  | 'desayunos'
  | 'almuerzos'
  | 'meriendas'
  | 'cenas'
  | 'snacks'
  | 'postres'
  | 'otros';

/** Stable display order for the buckets. */
export const SMART_CATEGORY_ORDER: SmartCategory[] = [
  'desayunos',
  'almuerzos',
  'meriendas',
  'cenas',
  'snacks',
  'postres',
  'otros',
];

export const SMART_CATEGORY_LABELS: Record<SmartCategory, string> = {
  desayunos: 'Desayunos',
  almuerzos: 'Almuerzos',
  meriendas: 'Meriendas',
  cenas: 'Cenas',
  snacks: 'Snacks',
  postres: 'Postres',
  otros: 'Otros',
};

const SMART_CATEGORY_KEYWORDS: Record<SmartCategory, string[]> = {
  desayunos: ['desayuno', 'breakfast', 'mañana', 'tostada', 'avena', 'granola', 'yogur', 'smoothie', 'batido', 'porridge', 'crepe', 'pancake', 'tortita', 'muffin'],
  almuerzos: ['almuerzo', 'comida', 'lunch', 'pasta', 'arroz', 'ensalada', 'sopa', 'wrap', 'bocadillo', 'sandwich', 'bocata'],
  meriendas: ['merienda', 'tentempié', 'tentempie'],
  cenas: ['cena', 'dinner', 'supper', 'crema', 'guiso', 'estofado', 'gratinado'],
  snacks: ['snack', 'barrita', 'fruta', 'nuez', 'almendra', 'dátil'],
  postres: ['postre', 'dessert', 'tarta', 'pastel', 'bizcocho', 'helado', 'brownie', 'galleta', 'flan', 'natillas', 'mousse', 'dulce'],
  otros: [],
};

// Maps the recipe's explicit MealCategory to its own bucket — every category
// the user can tag now has a visible home (postre ≠ snack ≠ merienda).
const MEAL_CATEGORY_TO_SMART: Record<MealCategory, SmartCategory> = {
  desayuno: 'desayunos',
  almuerzo: 'almuerzos',
  merienda: 'meriendas',
  cena: 'cenas',
  snack: 'snacks',
  postre: 'postres',
  otro: 'otros',
};

/**
 * All the SmartCategories a recipe belongs to. A recipe explicitly tagged with
 * several meal categories (e.g. almuerzo + cena) appears in every matching
 * bucket. Without explicit categories, keyword-matches name + ingredients into
 * a single bucket.
 */
export function smartCategoriesFor(recipe: Recipe): SmartCategory[] {
  const explicit = recipe.category ?? [];
  if (explicit.length > 0) {
    const set = new Set(explicit.map((c) => MEAL_CATEGORY_TO_SMART[c] ?? 'otros'));
    return SMART_CATEGORY_ORDER.filter((c) => set.has(c));
  }
  const haystack = `${recipe.name} ${(recipe.ingredients ?? []).map((i: { name: string }) => i.name).join(' ')}`.toLowerCase();
  for (const cat of SMART_CATEGORY_ORDER) {
    if (SMART_CATEGORY_KEYWORDS[cat].some((kw) => haystack.includes(kw))) return [cat];
  }
  return ['otros'];
}

/**
 * Classifies a recipe into its primary SmartCategory (first matching bucket in
 * canonical order).
 */
export function classifyRecipe(recipe: Recipe): SmartCategory {
  return smartCategoriesFor(recipe)[0] ?? 'otros';
}

/**
 * Groups recipes into buckets keyed by SmartCategory. Every bucket is present
 * (possibly empty), in {@link SMART_CATEGORY_ORDER}. A recipe with several
 * explicit categories appears in each of its buckets.
 */
export function groupRecipesByCategory(recipes: Recipe[]): Record<SmartCategory, Recipe[]> {
  const result: Record<SmartCategory, Recipe[]> = {
    desayunos: [], almuerzos: [], meriendas: [], cenas: [], snacks: [], postres: [], otros: [],
  };
  for (const r of recipes) {
    for (const cat of smartCategoriesFor(r)) result[cat].push(r);
  }
  return result;
}
