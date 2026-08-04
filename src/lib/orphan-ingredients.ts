import type { Firestore } from 'firebase-admin/firestore';

import { ingredientKey, normalizeText } from '@/lib/utils';
import type { BaseIngredient, Ingredient, Recipe } from '@/lib/types';

/**
 * Referencias rotas: líneas de receta que apuntan a un alimento que ya no está
 * en el catálogo con ese nombre.
 *
 * Una receta NO guarda los macros de cada ingrediente, solo `name`+`brand`;
 * los macros salen del catálogo global buscando por `ingredientKey`. Si un
 * alimento se renombra o se borra, esas líneas dejan de resolver y **suman 0**
 * al recalcular, sin decir nada.
 *
 * Corre con el Admin SDK a propósito: las rules dejan a un admin LEER las
 * recetas de todo el mundo (`match /{path=**}/recipes/{recipeId}`) pero no
 * escribirlas, y el panel corre como cliente. Desde el servidor se saltan las
 * rules y se pueden arreglar también las recetas privadas de cada usuario, que
 * es donde el renombrado desde el panel no llegaba.
 */

export interface OrphanRef {
  /** Nombre tal y como aparece en las recetas. */
  name: string;
  brand?: string;
  /** Cuántas líneas de receta lo usan. */
  uses: number;
  /** Nombres de recetas afectadas (como mucho unas pocas, para enseñarlas). */
  sampleRecipes: string[];
  /** true si alguna de las recetas es privada de un usuario. */
  inUserRecipes: boolean;
}

/** Gramos que aporta una línea. Espejo de `ingredientGrams` del cliente. */
function gramsOf(ing: Ingredient, base?: BaseIngredient): number {
  const unit = (ing.unit || '').toLowerCase();
  if (unit === 'g' || unit === 'ml' || unit === '') return ing.quantity;
  const weight =
    ing.unitWeight ??
    (base?.unitName && normalizeText(base.unitName) === normalizeText(ing.unit) ? base.unitWeight : undefined);
  return weight ? ing.quantity * weight : ing.quantity;
}

/** Índice del catálogo: por nombre+marca y, de respaldo, solo por nombre. */
function buildIndex(catalog: BaseIngredient[]): Map<string, BaseIngredient> {
  const map = new Map<string, BaseIngredient>();
  catalog.forEach((ing) => {
    map.set(ingredientKey(ing.name, ing.brand), ing);
    const nameOnly = normalizeText(ing.name);
    if (!map.has(nameOnly)) map.set(nameOnly, ing);
  });
  return map;
}

function resolve(index: Map<string, BaseIngredient>, name: string, brand?: string) {
  return index.get(ingredientKey(name, brand)) ?? index.get(normalizeText(name));
}

/** Totales del lote entero recalculados desde el catálogo. */
function recomputeTotals(ingredients: Ingredient[], index: Map<string, BaseIngredient>) {
  return ingredients.reduce(
    (acc, ing) => {
      const base = resolve(index, ing.name, ing.brand);
      if (!base) return acc;
      const f = gramsOf(ing, base) / 100;
      return {
        calories: acc.calories + (base.calories || 0) * f,
        protein: acc.protein + (base.protein || 0) * f,
        carbs: acc.carbs + (base.carbs || 0) * f,
        fat: acc.fat + (base.fat || 0) * f,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/** Todas las recetas: el recetario global y las privadas de cada usuario. */
async function allRecipeDocs(firestore: Firestore) {
  const [global, users] = await Promise.all([
    firestore.collection('nutriplanner_recipes').get(),
    // Distinto nombre de colección que `nutriplanner_recipes`, así que este
    // grupo NO la incluye: no hay recetas contadas dos veces.
    firestore.collectionGroup('recipes').get(),
  ]);
  return [
    ...global.docs.map((d) => ({ ref: d.ref, data: d.data() as Recipe, isUser: false })),
    ...users.docs.map((d) => ({ ref: d.ref, data: d.data() as Recipe, isUser: true })),
  ];
}

/** Agrupa por nombre roto las líneas que no resuelven contra el catálogo. */
export async function findOrphanRefs(firestore: Firestore): Promise<OrphanRef[]> {
  const catalogSnap = await firestore.collection('ingredients').get();
  const index = buildIndex(catalogSnap.docs.map((d) => d.data() as BaseIngredient));

  const byKey = new Map<string, OrphanRef>();
  for (const { data, isUser } of await allRecipeDocs(firestore)) {
    for (const ing of data.ingredients ?? []) {
      if (!ing?.name || resolve(index, ing.name, ing.brand)) continue;
      const key = ingredientKey(ing.name, ing.brand);
      const entry = byKey.get(key) ?? {
        name: ing.name,
        brand: ing.brand,
        uses: 0,
        sampleRecipes: [],
        inUserRecipes: false,
      };
      entry.uses += 1;
      entry.inUserRecipes = entry.inUserRecipes || isUser;
      if (entry.sampleRecipes.length < 4 && data.name && !entry.sampleRecipes.includes(data.name)) {
        entry.sampleRecipes.push(data.name);
      }
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()].sort((a, b) => b.uses - a.uses);
}

export interface RetargetResult {
  recipesUpdated: number;
  userRecipesUpdated: number;
}

/**
 * Reapunta todas las líneas que usaban `from` al alimento `toId` y **recalcula
 * los totales guardados** de esas recetas. Sin lo segundo la receta seguiría
 * enseñando los macros viejos: son un campo guardado, no un cálculo en vivo.
 */
export async function retargetOrphanRef(
  firestore: Firestore,
  from: { name: string; brand?: string },
  toId: string
): Promise<RetargetResult> {
  const catalogSnap = await firestore.collection('ingredients').get();
  // El id del documento manda sobre cualquier `id` que traiga el propio dato.
  const catalog = catalogSnap.docs.map((d) => ({ ...(d.data() as BaseIngredient), id: d.id }));
  const target = catalog.find((c) => c.id === toId);
  if (!target) throw new Error('El alimento de destino ya no existe.');

  const index = buildIndex(catalog);
  const fromKey = ingredientKey(from.name, from.brand);

  const batch = firestore.batch();
  let recipesUpdated = 0;
  let userRecipesUpdated = 0;

  for (const { ref, data, isUser } of await allRecipeDocs(firestore)) {
    const list = data.ingredients ?? [];
    if (!list.some((ing) => ingredientKey(ing.name, ing.brand) === fromKey)) continue;

    const next = list.map((ing) => {
      if (ingredientKey(ing.name, ing.brand) !== fromKey) return ing;
      const { brand: _drop, ...rest } = ing;
      return target.brand ? { ...rest, name: target.name, brand: target.brand } : { ...rest, name: target.name };
    });

    const totals = recomputeTotals(next, index);
    batch.update(ref, {
      ingredients: next,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    });
    recipesUpdated += 1;
    if (isUser) userRecipesUpdated += 1;
  }

  if (recipesUpdated > 0) await batch.commit();
  return { recipesUpdated, userRecipesUpdated };
}
