import { RecipeSchema, type BaseIngredient, type Ingredient, type MealCategory, type DietTag, type Recipe } from '@/lib/types';
import { normalizeText } from '@/lib/utils';

/**
 * Traducción de lo que devuelve la IA a una receta guardable.
 *
 * Existe porque había DOS traducciones distintas: la pantalla de revisión de la
 * app, que la hacía bien, y el guardado del servidor, que hacía
 * `{ ...recetaDeLaIA }` y se llevaba a Firestore todo lo que la IA hubiera
 * puesto — incluidos `esReceta`, `motivoNoReceta` y, en cada ingrediente, sus
 * macros POR 100 g. Eso último es especialmente traicionero: el ingrediente de
 * una receta solo lleva `name`+`quantity`+`unit`, y los macros por 100 g viven
 * en el catálogo. Guardarlos dentro de la receta crea una segunda fuente de
 * verdad que nadie lee y que queda desactualizada en cuanto se toca el catálogo.
 *
 * La IA devuelve un objeto más ancho que `Recipe`; aquí se recorta a lo que el
 * esquema admite y se valida con él, de forma que **es imposible guardar un
 * campo que el resto de la app no espera**.
 */

/** Lo que la IA devuelve: `Recipe` más los macros por 100 g de cada ingrediente. */
export interface AiRecipe {
  name?: string;
  description?: string;
  instructions?: string;
  servings?: number;
  imageHint?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  category?: string[];
  dietTags?: string[];
  ingredients?: {
    id?: string;
    name?: string;
    quantity?: number;
    unit?: string;
    /** Por 100 g — NO va dentro de la receta; sirve para dar de alta el alimento. */
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  }[];
}

const MEAL_CATEGORIES = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack', 'postre', 'otro'];
const DIET_TAGS = ['omnivora', 'vegetariana', 'vegana', 'keto', 'low_carb', 'sin_gluten', 'sin_lactosa'];

/**
 * Convierte y VALIDA. Lanza si lo que devolvió la IA no da para una receta:
 * mejor un error claro que un documento a medias en la base de datos.
 */
export function aiRecipeToRecipe(
  ai: AiRecipe,
  extra: { imageUrl?: string | null; sourceUrl?: string } = {}
): Omit<Recipe, 'id'> {
  const ingredients: Ingredient[] = (ai.ingredients ?? [])
    // Sin nombre no hay ingrediente que valga; sin cantidad se asume 0 y el
    // usuario lo ajusta, que es mejor que perder la línea entera.
    .filter((i) => !!i.name?.trim())
    .map((i, n) => ({
      id: i.id || `ing-${n + 1}`,
      name: i.name!.trim(),
      quantity: Number.isFinite(i.quantity) ? Number(i.quantity) : 0,
      unit: i.unit?.trim() || 'g',
    }));

  const candidate = {
    name: ai.name?.trim() || 'Receta importada',
    description: ai.description?.trim() ?? '',
    instructions: ai.instructions?.trim() ?? '',
    ingredients,
    calories: Math.round(ai.calories ?? 0),
    protein: Math.round(ai.protein ?? 0),
    carbs: Math.round(ai.carbs ?? 0),
    fat: Math.round(ai.fat ?? 0),
    // `min(1)` en el esquema: un 0 o un negativo de la IA rompería el escalado.
    servings: ai.servings && ai.servings >= 1 ? Math.round(ai.servings) : 1,
    ...(ai.imageHint ? { imageHint: ai.imageHint } : {}),
    // Se filtran contra los valores que el esquema conoce: la IA a veces inventa
    // categorías ("brunch") y una etiqueta desconocida tumbaría el parseo.
    ...(ai.category?.length
      ? { category: ai.category.filter((c): c is MealCategory => MEAL_CATEGORIES.includes(c)) }
      : {}),
    ...(ai.dietTags?.length
      ? { dietTags: ai.dietTags.filter((d): d is DietTag => DIET_TAGS.includes(d)) }
      : {}),
    ...(extra.imageUrl ? { imageUrl: extra.imageUrl } : {}),
    ...(extra.sourceUrl ? { sourceUrl: extra.sourceUrl } : {}),
    createdAt: new Date().toISOString(),
  };

  // La validación es el punto: si esto pasa, lo que se guarda encaja con lo que
  // el resto de la app sabe leer. `id` lo pone quien escriba en Firestore.
  return RecipeSchema.omit({ id: true }).parse(candidate);
}

/**
 * Alimentos que la IA inventó y no están en el catálogo, listos para darlos de
 * alta. Sin ellos, esas líneas suman 0 kcal al redimensionar el plato.
 *
 * Se compara por nombre normalizado, el mismo criterio que usa la pantalla de
 * revisión de la app.
 */
export function newBaseIngredients(
  ai: AiRecipe,
  knownNames: string[]
): Omit<BaseIngredient, 'id' | 'createdBy'>[] {
  const known = new Set(knownNames.map(normalizeText));
  const vistos = new Set<string>();

  return (ai.ingredients ?? [])
    .filter((i) => {
      const nombre = i.name?.trim();
      if (!nombre) return false;
      const clave = normalizeText(nombre);
      if (known.has(clave) || vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .map((i) => ({
      name: i.name!.trim(),
      calories: i.calories ?? 0,
      protein: i.protein ?? 0,
      carbs: i.carbs ?? 0,
      fat: i.fat ?? 0,
      fiber: i.fiber ?? 0,
    }));
}
