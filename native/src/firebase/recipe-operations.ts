import { addDoc, collection, doc, setDoc } from 'firebase/firestore';

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
 */
export async function saveUserRecipe(userId: string, recipe: Omit<Recipe, 'id'>): Promise<string> {
  const ref = doc(collection(firestore, 'users', userId, 'recipes'));
  await setDoc(ref, stripUndefined({ ...recipe, id: ref.id }), { merge: true });
  return ref.id;
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
