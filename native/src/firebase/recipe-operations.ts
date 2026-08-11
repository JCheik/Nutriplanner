import { addDoc, collection, deleteDoc, doc, setDoc } from 'firebase/firestore';

import { firestore } from '@/firebase';
import type { BaseIngredient, Recipe } from '@/lib/types';

/** Firestore rechaza `undefined`: fuera las claves opcionales sin valor. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * Guarda una receta en la colección del usuario (`users/{uid}/recipes`), con el
 * id del documento dentro del propio doc — misma convención que la web
 * (`saveRecipeClient`). Sin imagen: subir fotos desde la app llega más adelante.
 *
 * Con `recipeId` ACTUALIZA esa receta. Sin él, crea una nueva. Faltaba el
 * parámetro: el editor cargaba la receta existente, la dejabas editada… y al
 * guardar salía un documento nuevo, así que acababas con dos.
 */
export async function saveUserRecipe(
  userId: string,
  recipe: Omit<Recipe, 'id'>,
  recipeId?: string
): Promise<string> {
  const ref = recipeId
    ? doc(firestore, 'users', userId, 'recipes', recipeId)
    : doc(collection(firestore, 'users', userId, 'recipes'));
  // Sello de creación, solo al crear (ver `createdAt` en types.ts). Sin esto,
  // encontrar la receta que acabas de importar entre 130 es imposible.
  const sello = recipeId ? {} : { createdAt: recipe.createdAt ?? new Date().toISOString() };
  await setDoc(ref, stripUndefined({ ...recipe, id: ref.id, ...sello }), { merge: true });
  return ref.id;
}

/**
 * Guarda una receta del recetario de Nutrilp (`nutriplanner_recipes`). Solo la
 * dejan escribir las rules a un admin; la app enseña el botón según el claim
 * del token, pero quien decide de verdad es Firestore.
 *
 * Con `recipeId` actualiza esa receta; sin él, crea una nueva.
 */
export async function saveGlobalRecipe(recipe: Omit<Recipe, 'id'>, recipeId?: string): Promise<string> {
  const ref = recipeId
    ? doc(firestore, 'nutriplanner_recipes', recipeId)
    : doc(collection(firestore, 'nutriplanner_recipes'));
  // Sello de creación, solo al crear (ver `createdAt` en types.ts). Sin esto,
  // encontrar la receta que acabas de importar entre 130 es imposible.
  const sello = recipeId ? {} : { createdAt: recipe.createdAt ?? new Date().toISOString() };
  await setDoc(ref, stripUndefined({ ...recipe, id: ref.id, ...sello }), { merge: true });
  return ref.id;
}

/**
 * Borra una receta PROPIA (`users/{uid}/recipes/{id}`).
 *
 * Lo que ya esté puesto en el plan NO se toca: el plan guarda una copia de la
 * receta en cada hueco, así que la semana que tenías montada sigue en pie.
 */
export function deleteUserRecipe(userId: string, recipeId: string) {
  return deleteDoc(doc(firestore, 'users', userId, 'recipes', recipeId));
}

/** Borra una receta del recetario de Nutrilp. Solo admins (lo imponen las rules). */
export function deleteGlobalRecipe(recipeId: string) {
  return deleteDoc(doc(firestore, 'nutriplanner_recipes', recipeId));
}

/**
 * Crea en el catálogo compartido los alimentos que la IA inventó y no existían,
 * para que los macros de la receta cuadren de verdad al escalarla (si no,
 * esas líneas sumarían 0 kcal). Mismo criterio que el flujo de revisión web.
 */
export async function createBaseIngredients(
  userId: string,
  ingredients: Omit<BaseIngredient, 'id' | 'createdBy'>[]
): Promise<void> {
  if (ingredients.length === 0) return;
  const col = collection(firestore, 'ingredients');
  await Promise.all(
    ingredients.map((ing) => addDoc(col, stripUndefined({ ...ing, createdBy: userId })))
  );
}
