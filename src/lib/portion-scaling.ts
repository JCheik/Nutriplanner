import type { BaseIngredient, Ingredient, Macros, Recipe } from '@/lib/types';
import { buildIngredientIndex, ingredientGrams, ingredientMacros, lookupIngredient } from '@/lib/recipe-macros';
import { normalizeText } from '@/lib/utils';

/**
 * Redimensionar una receta al tamaño de quien la mira, SIN multiplicar lo que
 * no se multiplica.
 *
 * El recetario de Nutrilp se escribe una vez y lo comen personas que necesitan
 * 1900 kcal y personas que necesitan 2900. Servir el mismo plato a los dos es
 * darle de más a una y de menos al otro. Pero escalar la receta entera por 1,46
 * tampoco vale: el aceite, la sal y las especias no dependen de lo grande que
 * seas. Un guiso para una persona más lleva más arroz, no más pimienta.
 *
 * Por eso el escalado es afín, no lineal:
 *
 *     escalado = fijo + (total − fijo) × factor
 *
 * `fijo` se calcula una vez (al guardar la receta) y se guarda en
 * `Recipe.fixedMacros`. Si se calculase al vuelo haría falta resolver el
 * catálogo de ingredientes en cada pantalla que enseña un número, y ahí es donde
 * nacen las incoherencias entre el plan, el diario y la lista de la compra.
 *
 * Las recetas sin `fixedMacros` (todas hasta el rellenado del catálogo) escalan
 * linealmente: `fijo = 0`. Degrada solo, no rompe.
 */

/**
 * Lo que no crece cuando crece el plato. Sin tildes: se comparan contra
 * `normalizeText`.
 *
 * Casi todo esto aporta ~0 kcal y congelarlo es sobre todo cosmético — quien
 * de verdad mueve el número es la grasa, que es calórica y suele ir en dosis
 * pequeñas. Aun así entra la lista entera: "1,46 hojas de laurel" en el modo
 * cocina queda igual de mal aunque no cambie las calorías.
 */
const NON_SCALING_TERMS = [
  // Grasas de cocinado (las que mueven las kcal)
  'aceite', 'oliva', 'girasol', 'mantequilla', 'margarina', 'manteca',
  // Sal y ácidos
  'sal', 'vinagre', 'zumo de limon', 'limon exprimido',
  // Especias y hierbas
  'pimienta', 'pimenton', 'paprika', 'oregano', 'comino', 'curry', 'canela',
  'nuez moscada', 'laurel', 'tomillo', 'romero', 'albahaca', 'perejil',
  'cilantro', 'eneldo', 'hierbabuena', 'menta', 'clavo', 'anis', 'azafran',
  'curcuma', 'cayena', 'guindilla', 'jengibre en polvo', 'ajo en polvo',
  'cebolla en polvo', 'especia', 'condimento', 'hierbas provenzales',
  // Levantes, esencias y edulcorantes
  'levadura', 'bicarbonato', 'esencia', 'extracto', 'colorante',
  'edulcorante', 'stevia', 'sacarina',
];

/**
 * Por encima de esto ya no es un condimento aunque se llame igual: 200 ml de
 * aceite son el grueso de un frito, y 100 g de mantequilla son el grueso de un
 * bizcocho. Sin este tope, escalar un bizcocho no escalaría casi nada.
 */
const NON_SCALING_MAX_GRAMS = 30;

/** ¿Esta línea de ingrediente se queda igual al redimensionar el plato? */
export function isFixedIngredient(ing: Ingredient, base?: BaseIngredient): boolean {
  const name = normalizeText(ing.name);
  if (!NON_SCALING_TERMS.some((term) => name.includes(term))) return false;
  return ingredientGrams(ing, base) <= NON_SCALING_MAX_GRAMS;
}

/**
 * Parte de los macros del LOTE que no escala. Se guarda en la receta al
 * crearla/editarla y se rellena en el catálogo desde `/admin/verificar-recetas`.
 */
export function computeFixedMacros(
  ingredients: Ingredient[],
  catalog: BaseIngredient[] | null | undefined
): Macros {
  const index = buildIngredientIndex(catalog);
  return ingredients.reduce<Macros>((acc, ing) => {
    const base = lookupIngredient(index, ing.name, ing.brand);
    if (!isFixedIngredient(ing, base)) return acc;
    const m = ingredientMacros(ing, index);
    return {
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

/** Los macros que NO escalan, con 0 de respaldo para recetas sin el campo. */
function fixedOf(recipe: Pick<Recipe, 'fixedMacros'>): Macros {
  return recipe.fixedMacros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

/**
 * Macros del LOTE redimensionado: `fijo + (total − fijo) × factor`.
 * Con `factor = 1` devuelve exactamente los totales guardados.
 */
export function scaleBatchMacros(
  recipe: Pick<Recipe, 'calories' | 'protein' | 'carbs' | 'fat' | 'fixedMacros'>,
  factor: number
): Macros {
  const fixed = fixedOf(recipe);
  const affine = (total: number, f: number) => f + Math.max(0, total - f) * factor;
  return {
    calories: affine(recipe.calories || 0, fixed.calories),
    protein: affine(recipe.protein || 0, fixed.protein),
    carbs: affine(recipe.carbs || 0, fixed.carbs),
    fat: affine(recipe.fat || 0, fixed.fat),
  };
}

/**
 * La cantidad de una línea, al tamaño pedido. Los condimentos se quedan como
 * están; el resto se redondea a algo que se pueda medir en una cocina: gramos
 * enteros al peso, y medias piezas cuando son unidades ("1,5 huevos" es raro
 * pero medible; "1,46 huevos" no significa nada).
 */
export function scaleIngredientQuantity(
  ing: Ingredient,
  factor: number,
  base?: BaseIngredient
): number {
  if (factor === 1 || isFixedIngredient(ing, base)) return ing.quantity;
  const scaled = ing.quantity * factor;
  const unit = (ing.unit || '').toLowerCase();
  if (unit === 'g' || unit === 'ml' || unit === '') {
    // Por debajo de 10 g medio gramo sí importa (levaduras, cafés); por encima,
    // el gramo entero es de sobra y un decimal solo ensucia la lectura.
    return scaled < 10 ? Math.round(scaled * 2) / 2 : Math.round(scaled);
  }
  return Math.max(0.5, Math.round(scaled * 2) / 2);
}

/**
 * La receta entera al tamaño pedido: macros del lote y cantidades, coherentes
 * entre sí. Para pintar la ficha de una receta o el modo cocina.
 */
export function scaleRecipe(
  recipe: Recipe,
  factor: number,
  catalog?: BaseIngredient[] | null
): { macros: Macros; ingredients: Ingredient[] } {
  const index = buildIngredientIndex(catalog);
  return {
    macros: scaleBatchMacros(recipe, factor),
    ingredients: (recipe.ingredients || []).map((ing) => ({
      ...ing,
      quantity: scaleIngredientQuantity(ing, factor, lookupIngredient(index, ing.name, ing.brand)),
    })),
  };
}
