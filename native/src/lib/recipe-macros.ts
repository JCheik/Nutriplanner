import type { BaseIngredient, Ingredient, Macros } from '@/lib/types';
import { ingredientKey, normalizeText } from '@/lib/utils';

/**
 * Cálculo de los macros de una receta a partir de sus ingredientes y del
 * catálogo compartido. Copiado de la web (la vista previa en vivo del editor y
 * `admin/verificar-recetas` usan exactamente esta lógica) para que un mismo
 * plato dé los mismos números en los dos sitios.
 *
 * Recordatorio del modelo: el ingrediente de una receta NO guarda macros, solo
 * `name`+`brand`+`quantity`+`unit`. Los macros viven en el catálogo global por
 * cada 100 g, y la identidad es `ingredientKey(name, brand)`.
 */

export type IngredientIndex = Map<string, BaseIngredient>;

/** Índice por clave nombre+marca y, de respaldo, solo por nombre. */
export function buildIngredientIndex(catalog: BaseIngredient[] | null | undefined): IngredientIndex {
  const map: IngredientIndex = new Map();
  (catalog ?? []).forEach((ing) => {
    map.set(ingredientKey(ing.name, ing.brand), ing);
    const nameOnly = normalizeText(ing.name);
    if (!map.has(nameOnly)) map.set(nameOnly, ing);
  });
  return map;
}

export function lookupIngredient(index: IngredientIndex, name: string, brand?: string) {
  return index.get(ingredientKey(name, brand)) ?? index.get(normalizeText(name));
}

/**
 * Gramos que aporta una línea de ingrediente.
 * `g`/`ml`/vacío → la cantidad ya son gramos. Cualquier otra unidad es una
 * pieza, y se multiplica por su peso (el de la línea si lo trae, o el del
 * catálogo si la unidad coincide).
 */
export function ingredientGrams(ing: Ingredient, base?: BaseIngredient): number {
  const unit = (ing.unit || '').toLowerCase();
  if (unit === 'g' || unit === 'ml' || unit === '') return ing.quantity;
  const weight =
    ing.unitWeight ??
    (base?.unitName && normalizeText(base.unitName) === normalizeText(ing.unit) ? base.unitWeight : undefined);
  return weight ? ing.quantity * weight : ing.quantity;
}

/**
 * Lo que aporta UNA línea al total. Ceros si el alimento no está en el
 * catálogo, que es justo el caso que hay que enseñar en la UI: la línea existe
 * pero no suma nada.
 */
export function ingredientMacros(ing: Ingredient, index: IngredientIndex): Macros {
  const base = lookupIngredient(index, ing.name, ing.brand);
  if (!base) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const factor = ingredientGrams(ing, base) / 100;
  return {
    calories: (base.calories || 0) * factor,
    protein: (base.protein || 0) * factor,
    carbs: (base.carbs || 0) * factor,
    fat: (base.fat || 0) * factor,
  };
}

/**
 * Totales del LOTE entero (no por ración): es lo que se guarda en el documento
 * de receta, y `perServingMacros` divide después entre `servings`.
 * Los ingredientes que no estén en el catálogo suman 0 — se avisa en la UI.
 */
export function computeRecipeTotals(ingredients: Ingredient[], index: IngredientIndex): Macros {
  return ingredients.reduce((total, ing) => {
    const m = ingredientMacros(ing, index);
    return {
      calories: total.calories + m.calories,
      protein: total.protein + m.protein,
      carbs: total.carbs + m.carbs,
      fat: total.fat + m.fat,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
