/**
 * Smart classification of recipes into broad buckets (Desayunos / Almuerzos /
 * Cenas / Snacks / Otros) for grouping in the UI. Prefers the recipe's explicit
 * MealCategory and falls back to keyword matching on name + ingredients. No
 * Firestore reads/writes — pure functions, safe on client and server.
 *
 * Single source of truth shared by the recipe library sidebar and the
 * "add recipe to a slot" selection dialog.
 */
import type { Recipe, MealCategory } from '@/lib/types';

export type SmartCategory = 'desayunos' | 'almuerzos' | 'cenas' | 'snacks' | 'otros';

/** Stable display order for the buckets. */
export const SMART_CATEGORY_ORDER: SmartCategory[] = [
  'desayunos',
  'almuerzos',
  'cenas',
  'snacks',
  'otros',
];

export const SMART_CATEGORY_LABELS: Record<SmartCategory, string> = {
  desayunos: 'Desayunos',
  almuerzos: 'Almuerzos',
  cenas: 'Cenas',
  snacks: 'Snacks',
  otros: 'Otros',
};

const SMART_CATEGORY_KEYWORDS: Record<SmartCategory, string[]> = {
  desayunos: ['desayuno', 'breakfast', 'mañana', 'tostada', 'avena', 'granola', 'yogur', 'smoothie', 'batido', 'porridge', 'crepe', 'pancake', 'tortita', 'muffin'],
  almuerzos: ['almuerzo', 'comida', 'lunch', 'pasta', 'arroz', 'ensalada', 'sopa', 'wrap', 'bocadillo', 'sandwich', 'bocata'],
  cenas: ['cena', 'dinner', 'supper', 'crema', 'guiso', 'estofado', 'gratinado'],
  snacks: ['snack', 'merienda', 'tentempié', 'barrita', 'fruta', 'nuez', 'almendra', 'dátil'],
  otros: [],
};

// Maps the recipe's explicit MealCategory to a bucket. Merienda/snack/postre
// all fold into "Snacks"; "otro" into "Otros".
const MEAL_CATEGORY_TO_SMART: Record<MealCategory, SmartCategory> = {
  desayuno: 'desayunos',
  almuerzo: 'almuerzos',
  cena: 'cenas',
  merienda: 'snacks',
  snack: 'snacks',
  postre: 'snacks',
  otro: 'otros',
};

/**
 * Classifies a recipe into a SmartCategory. Uses the explicit category when set,
 * otherwise keyword-matches the name + ingredient names.
 */
export function classifyRecipe(recipe: Recipe): SmartCategory {
  const explicit = recipe.category ?? [];
  if (explicit.length > 0) {
    return MEAL_CATEGORY_TO_SMART[explicit[0]] ?? 'otros';
  }
  const haystack = `${recipe.name} ${(recipe.ingredients ?? []).map((i: { name: string }) => i.name).join(' ')}`.toLowerCase();
  for (const cat of SMART_CATEGORY_ORDER) {
    if (SMART_CATEGORY_KEYWORDS[cat].some((kw) => haystack.includes(kw))) return cat;
  }
  return 'otros';
}

/**
 * Groups recipes into buckets keyed by SmartCategory. Every bucket is present
 * (possibly empty), in {@link SMART_CATEGORY_ORDER}.
 */
export function groupRecipesByCategory(recipes: Recipe[]): Record<SmartCategory, Recipe[]> {
  const result: Record<SmartCategory, Recipe[]> = {
    desayunos: [], almuerzos: [], cenas: [], snacks: [], otros: [],
  };
  for (const r of recipes) result[classifyRecipe(r)].push(r);
  return result;
}
