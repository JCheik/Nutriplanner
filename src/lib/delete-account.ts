import type { Firestore } from 'firebase-admin/firestore';
import type { Storage } from 'firebase-admin/storage';

import { initializeFirebase } from '@/firebase/server-init';

/**
 * Borrado completo de una cuenta y sus datos. Implementación ÚNICA, usada por
 * los dos caminos que existen:
 *   - el usuario se borra a sí mismo (endpoint `/api/account/delete`, que es lo
 *     que exigen Google Play y App Store para poder publicar),
 *   - un admin borra a otro (`deleteUserAccount` en `lib/actions.ts`).
 *
 * Antes vivía suelta dentro de actions.ts y su lista de subcolecciones se había
 * quedado vieja: borraba `meal_plans` (legacy, ya sin uso) pero NO `diary`,
 * `weekHistory` ni los alimentos privados, así que dejaba datos huérfanos.
 */

/**
 * Subcolecciones de `users/{uid}`. Fuente: DATABASE.md — mantener en sincronía
 * si se añade alguna. `folders`/`meal_plans` son legacy: se listan a propósito
 * para limpiar cuentas antiguas que aún las tengan.
 */
const USER_SUBCOLLECTIONS = [
  'recipes',
  'weekPlan',
  'weekHistory',
  'diary',
  'ingredients',
  'folders',
  'meal_plans',
] as const;

/**
 * Borra las subcolecciones del usuario y su doc de perfil. NO toca el catálogo
 * global `ingredients`: aunque el usuario creara alguna entrada, otras recetas
 * de otra gente pueden estar apuntando a ella y se quedarían sin macros.
 */
export async function deleteUserRelatedData(uid: string, firestore: Firestore, storage: Storage) {
  const userDocRef = firestore.collection('users').doc(uid);
  const bucket = storage.bucket();
  const urlPrefix = `https://storage.googleapis.com/${bucket.name}/`;

  for (const sub of USER_SUBCOLLECTIONS) {
    const snapshot = await userDocRef.collection(sub).get();
    if (snapshot.empty) continue;

    // Las imágenes se borran esperándolas explícitamente: si se lanzaran dentro
    // de un forEach async sin await, el commit resolvería antes y quedarían
    // ficheros huérfanos en Storage.
    const imageDeletions: Promise<unknown>[] = [];
    const batch = firestore.batch();

    snapshot.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
      const url = sub === 'recipes' ? docSnapshot.data().imageUrl : undefined;
      if (url && typeof url === 'string' && url.startsWith(urlPrefix)) {
        const path = decodeURIComponent(url.replace(urlPrefix, ''));
        imageDeletions.push(
          bucket
            .file(path)
            .delete()
            .catch((storageError) => {
              console.error(`Failed to delete image for recipe ${docSnapshot.id}:`, storageError);
            })
        );
      }
    });

    await Promise.all(imageDeletions);
    await batch.commit();
  }

  await userDocRef.delete();
}

/**
 * Borra la cuenta entera: primero los datos, después el usuario de Auth. Ese
 * orden importa — si se borrara Auth primero y fallara la limpieza, quedarían
 * datos sin dueño y sin forma de reintentarlo desde la app.
 */
export async function deleteAccountCompletely(uid: string) {
  const { auth, firestore, storage } = initializeFirebase();
  await deleteUserRelatedData(uid, firestore, storage);
  await auth.deleteUser(uid);
}
