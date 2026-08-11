import { initializeFirebase } from '@/firebase/server-init';
import type { BaseIngredient, Recipe } from '@/lib/types';
import { normalizeText } from '@/lib/utils';

/**
 * Persistencia de la importación EN EL SERVIDOR.
 *
 * **Solo servidor**: importa `server-init`, que arrastra el Admin SDK. No hay
 * marca `'server-only'` porque el paquete no es dependencia del proyecto; el
 * propio import del Admin SDK ya rompería el bundle de cliente si alguien lo
 * usara donde no debe.
 *
 * El móvil dejaba de importar en cuanto el sistema lo suspendía: el trabajo
 * corría dentro de la app y el único sitio donde aterrizaba la receta era la
 * respuesta HTTP. Compartías un reel desde Instagram, volvías a Instagram, y la
 * receta se perdía sin que nadie te lo dijera.
 *
 * Ahora el resultado no depende de que el móvil siga vivo: **el servidor guarda
 * la receta y deja constancia del trabajo en Firestore**. La app pasa a ser un
 * espectador — lanza la petición, se desentiende, y al volver encuentra la
 * receta puesta (o el motivo por el que no).
 *
 * No hace falta una Cloud Function para esto: el endpoint ya corre en un
 * servidor (App Hosting), ya está autenticado, ya tiene la clave de Gemini y ya
 * tiene el Admin SDK. Lo que faltaba era escribir el resultado en vez de solo
 * devolverlo. Una función aparte significaría un despliegue nuevo, una segunda
 * copia del secreto y duplicar los flujos de `src/ai/flows`.
 */

/** Estado del trabajo, tal y como lo lee la app. */
export interface ImportJobDoc {
  status: 'working' | 'done' | 'error';
  /** Para poder decir "Leyendo Instagram…" sin que la app lo deduzca. */
  label: string;
  startedAt: string;
  finishedAt?: string;
  /** Presentes cuando `status === 'done'`. */
  recipeId?: string;
  recipeName?: string;
  /** Presente cuando `status === 'error'`. */
  message?: string;
}

function jobRef(uid: string, jobId: string) {
  const { firestore } = initializeFirebase();
  return firestore.doc(`users/${uid}/importJobs/${jobId}`);
}

export async function startImportJob(uid: string, jobId: string, label: string): Promise<void> {
  try {
    await jobRef(uid, jobId).set({
      status: 'working',
      label,
      startedAt: new Date().toISOString(),
    } satisfies ImportJobDoc);
  } catch (e) {
    // Que no se pueda dejar constancia no debe impedir la importación en sí: el
    // camino de siempre (esperar la respuesta) sigue funcionando.
    console.warn('[import-persist] no se pudo abrir el trabajo:', e);
  }
}

export async function failImportJob(uid: string, jobId: string, message: string): Promise<void> {
  try {
    await jobRef(uid, jobId).set(
      { status: 'error', message, finishedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (e) {
    console.warn('[import-persist] no se pudo cerrar el trabajo con error:', e);
  }
}

/**
 * Da de alta en el catálogo compartido los alimentos que la IA inventó y no
 * existían. Réplica de lo que hacía la pantalla de revisión: sin ellos, esas
 * líneas de la receta suman 0 kcal al escalarla.
 *
 * Se compara por nombre normalizado, el mismo criterio que usaba la app.
 */
async function createMissingIngredients(uid: string, recipe: Recipe): Promise<number> {
  const { firestore } = initializeFirebase();
  const snap = await firestore.collection('ingredients').get();
  const known = new Set(
    snap.docs.map((d) => normalizeText((d.data() as BaseIngredient).name ?? ''))
  );

  const nuevos = (recipe.ingredients ?? []).filter((i) => !known.has(normalizeText(i.name)));
  if (nuevos.length === 0) return 0;

  const batch = firestore.batch();
  for (const i of nuevos) {
    // Los macros por 100 g los trae el propio resultado de la IA; el esquema de
    // receta no los lleva, así que se leen del objeto suelto que devuelve.
    const raw = i as unknown as Record<string, number | undefined>;
    batch.set(firestore.collection('ingredients').doc(), {
      name: i.name,
      calories: raw.calories ?? 0,
      protein: raw.protein ?? 0,
      carbs: raw.carbs ?? 0,
      fat: raw.fat ?? 0,
      fiber: raw.fiber ?? 0,
      createdBy: uid,
    });
  }
  await batch.commit();
  return nuevos.length;
}

/**
 * Guarda la receta en `users/{uid}/recipes` y cierra el trabajo.
 *
 * Se guarda tal cual la devolvió la IA, sin pasar por revisión: es lo que pidió
 * el usuario ("guardada como <nombre>"), y una receta guardada se edita o se
 * borra como cualquier otra. El cartel "NUEVA" y el aviso con el nombre son los
 * que la hacen encontrable.
 */
export async function finishImportJob(
  uid: string,
  jobId: string,
  recipe: Recipe,
  imageUrl?: string | null
): Promise<{ recipeId: string; recipeName: string }> {
  const { firestore } = initializeFirebase();

  // Los alimentos primero: si falla, la receta se guarda igual (mismo criterio
  // que tenía la pantalla de revisión).
  try {
    await createMissingIngredients(uid, recipe);
  } catch (e) {
    console.warn('[import-persist] no se pudieron crear alimentos nuevos:', e);
  }

  const ref = firestore.collection(`users/${uid}/recipes`).doc();
  const toSave = {
    ...recipe,
    id: ref.id,
    ...(imageUrl ? { imageUrl } : {}),
    createdAt: new Date().toISOString(),
  };
  // El Admin SDK rechaza `undefined`; se quitan antes de escribir.
  const limpio = Object.fromEntries(Object.entries(toSave).filter(([, v]) => v !== undefined));

  await ref.set(limpio);

  await jobRef(uid, jobId).set(
    {
      status: 'done',
      recipeId: ref.id,
      recipeName: recipe.name,
      finishedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { recipeId: ref.id, recipeName: recipe.name };
}
