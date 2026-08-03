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

/** Máximo de operaciones por batch que acepta Firestore. */
const BATCH_LIMIT = 500;

/**
 * Borra las subcolecciones del usuario y su doc de perfil. NO toca el catálogo
 * global `ingredients`: aunque el usuario creara alguna entrada, otras recetas
 * de otra gente pueden estar apuntando a ella y se quedarían sin macros.
 */
export async function deleteUserRelatedData(uid: string, firestore: Firestore, storage: Storage) {
  const userDocRef = firestore.collection('users').doc(uid);

  // Storage es accesorio: si el bucket no resuelve (mal configurado, sin
  // permisos), las fotos se quedan huérfanas pero la cuenta DEBE poder
  // borrarse igual — es una obligación legal, no puede depender de esto.
  let bucket: ReturnType<Storage['bucket']> | null = null;
  let urlPrefix = '';
  try {
    bucket = storage.bucket();
    urlPrefix = `https://storage.googleapis.com/${bucket.name}/`;
  } catch (bucketError) {
    console.error('No se pudo resolver el bucket de Storage; se borran solo los datos:', bucketError);
  }

  for (const sub of USER_SUBCOLLECTIONS) {
    const snapshot = await userDocRef.collection(sub).get();
    if (snapshot.empty) continue;

    // Las imágenes se borran esperándolas explícitamente: si se lanzaran dentro
    // de un forEach async sin await, el commit resolvería antes y quedarían
    // ficheros huérfanos en Storage.
    const imageDeletions: Promise<unknown>[] = [];
    const docs = snapshot.docs;

    for (const docSnapshot of docs) {
      const url = bucket && sub === 'recipes' ? docSnapshot.data().imageUrl : undefined;
      if (url && typeof url === 'string' && url.startsWith(urlPrefix)) {
        const path = decodeURIComponent(url.replace(urlPrefix, ''));
        imageDeletions.push(
          bucket!
            .file(path)
            .delete()
            .catch((storageError) => {
              console.error(`Failed to delete image for recipe ${docSnapshot.id}:`, storageError);
            })
        );
      }
    }

    await Promise.all(imageDeletions);

    // En tandas de 500: es el máximo de operaciones por batch de Firestore, y
    // pasarse hace fallar el commit ENTERO. Con un diario de meses o muchos
    // alimentos propios se supera de sobra, y entonces no se borraba nada.
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = firestore.batch();
      for (const docSnapshot of docs.slice(i, i + BATCH_LIMIT)) {
        batch.delete(docSnapshot.ref);
      }
      await batch.commit();
    }
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
