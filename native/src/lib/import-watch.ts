import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import { auth, firestore } from '@/firebase';

/**
 * Seguimiento del trabajo de importación **por Firestore**, no por la respuesta
 * HTTP.
 *
 * El servidor guarda la receta y deja constancia en
 * `users/{uid}/importJobs/{jobId}` (ver `src/lib/import-persist.ts` de la web).
 * Eso cambia el papel de la app: ya no es quien importa, es quien mira. Si
 * Android la mata mientras vuelves a Instagram, el servidor termina igual y la
 * receta está puesta cuando vuelves.
 *
 * Aquí solo se guarda el id del último trabajo lanzado, para poder preguntar
 * "¿en qué quedó?" al arrancar.
 */

const LAST_JOB_KEY = 'nutrilp.import.lastJob';

export interface ImportJobDoc {
  status: 'working' | 'done' | 'error';
  label: string;
  startedAt: string;
  finishedAt?: string;
  recipeId?: string;
  recipeName?: string;
  message?: string;
}

/** Id nuevo. `randomUUID` no está en todos los runtimes de RN, así que a mano. */
export function newJobId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function rememberJob(jobId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_JOB_KEY, jobId);
  } catch {
    /* sin memoria del trabajo se pierde el aviso al volver, no la receta */
  }
}

export async function forgetJob(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_JOB_KEY);
  } catch {
    /* da igual */
  }
}

function jobPath(jobId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return doc(firestore, 'users', uid, 'importJobs', jobId);
}

/** Lee el estado de un trabajo. `null` si no hay sesión o no existe. */
export async function readJob(jobId: string): Promise<ImportJobDoc | null> {
  const ref = jobPath(jobId);
  if (!ref) return null;
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as ImportJobDoc) : null;
  } catch {
    return null;
  }
}

/**
 * Se suscribe hasta que el trabajo termina. Devuelve la función para cortar.
 *
 * Se usa cuando la app SÍ sigue viva: así la burbuja se entera por Firestore y
 * no por la petición, que es justo lo que puede morirse.
 */
export function watchJob(
  jobId: string,
  onChange: (job: ImportJobDoc) => void
): () => void {
  const ref = jobPath(jobId);
  if (!ref) return () => {};
  const stop = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return;
      onChange(snap.data() as ImportJobDoc);
    },
    () => {
      /* sin permisos o sin red: el camino de la respuesta HTTP sigue ahí */
    }
  );
  return stop;
}

/** El último trabajo lanzado, para preguntar al arrancar en qué quedó. */
export async function lastJobId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_JOB_KEY);
  } catch {
    return null;
  }
}
