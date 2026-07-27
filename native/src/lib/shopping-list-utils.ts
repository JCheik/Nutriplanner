// Copiado de la web (src/lib/shopping-list-utils.ts) — mantener en sincronía hasta que exista un paquete compartido.
import type { DayPlan, ShoppingListItem } from './types';
import { ingredientKey, normalizeText, pluralizeUnit } from './utils';

/**
 * Builds the shopping list from the week plan. Single implementation shared by
 * the web sheet and the mobile page (they used to have divergent copies).
 *
 * - Quantities are scaled by the servings planned in each placement
 *   (`servingsEaten / recipe.servings`): planning 1 serving of a 4-serving
 *   batch adds 1/4 of each ingredient, not the whole batch.
 * - Aggregation key is accent-insensitive and brand-aware (ingredientKey), so
 *   "limón" and "limon" merge but two brands of the same product don't.
 */
export function generateShoppingListFromPlan(weekPlan: DayPlan[] | null | undefined): ShoppingListItem[] {
  const aggregated = new Map<string, { name: string; brand?: string; quantity: number; unit: string }>();
  if (!weekPlan) return [];

  weekPlan.forEach(dayPlan => {
    (dayPlan.meals || []).forEach(meal => {
      (meal.recipes || []).forEach(recipe => {
        const batchServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
        const scale = (recipe.servingsEaten ?? 1) / batchServings;
        (recipe.ingredients || []).forEach(ingredient => {
          const unit = ingredient.unit || 'g';
          const key = `${ingredientKey(ingredient.name, ingredient.brand)}|${normalizeText(unit)}`;
          const existing = aggregated.get(key);
          const qty = ingredient.quantity * scale;
          if (existing) {
            existing.quantity += qty;
          } else {
            aggregated.set(key, {
              name: ingredient.name,
              ...(ingredient.brand ? { brand: ingredient.brand } : {}),
              quantity: qty,
              unit,
            });
          }
        });
      });
    });
  });

  return [...aggregated.values()]
    .map((item, index) => ({
      ...item,
      // Grams/ml round to whole numbers; piece counts round UP (you can't buy
      // 1.3 lonchas) but keep at least 1.
      quantity: isWeightUnit(item.unit) ? Math.round(item.quantity) : Math.max(1, Math.ceil(item.quantity)),
      id: `gen-${index}`,
      checked: false,
    }))
    .sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)));
}

function isWeightUnit(unit: string): boolean {
  const u = unit.toLowerCase();
  return u === 'g' || u === 'ml' || u === '';
}

/** "200 g" · "2 lonchas" · "" when there's no quantity. */
export function formatShoppingQuantity(quantity: number, unit: string): string {
  if (!quantity || quantity <= 0) return '';
  if (isWeightUnit(unit)) return `${Math.round(quantity)}${unit ? ` ${unit}` : ''}`;
  return `${quantity} ${pluralizeUnit(unit, quantity)}`;
}

// Supermarket aisle guesser. Keywords are accent-free (names are normalized
// before matching, so "limón" hits "limon" without duplicate entries).
const CATEGORIES: Record<string, string[]> = {
  'Frutas y Verduras': ['tomate', 'cebolla', 'ajo', 'lechuga', 'pimiento', 'zanahoria', 'patata', 'brocoli', 'espinaca', 'manzana', 'platano', 'naranja', 'limon', 'fresa', 'uva', 'aguacate', 'champinon', 'calabacin', 'calabaza', 'pepino', 'berenjena', 'puerro', 'apio', 'kiwi', 'pera', 'melocoton', 'seta'],
  'Carnes y Pescados': ['pollo', 'ternera', 'cerdo', 'pavo', 'carne', 'jamon', 'salmon', 'atun', 'merluza', 'pescado', 'gamba', 'marisco', 'bacalao', 'lomo', 'salchicha'],
  'Lácteos y Huevos': ['leche', 'queso', 'yogur', 'mantequilla', 'nata', 'huevo', 'kefir'],
  'Despensa': ['arroz', 'pasta', 'pan', 'avena', 'harina', 'macarrones', 'fideos', 'azucar', 'sal', 'pimienta', 'oregano', 'aceite', 'vinagre', 'caldo', 'salsa', 'lenteja', 'garbanzo', 'alubia', 'tomate frito', 'especia', 'canela', 'curry', 'soja', 'miel'],
};

export function getShoppingCategory(itemName: string): string {
  const normalized = normalizeText(itemName);
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return category;
    }
  }
  return 'Otros';
}
