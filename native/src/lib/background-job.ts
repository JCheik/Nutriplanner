import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { Href } from 'expo-router/build/typed-routes/types';
import { useSyncExternalStore } from 'react';

import { forgetJob, lastJobId, readJob } from '@/lib/import-watch';
import { notifyJobEnded, primeJobNotifications } from '@/lib/job-notification';

/**
 * Trabajos que siguen corriendo mientras navegas.
 *
 * Importar una receta o autocompletar la semana tardan entre unos segundos y
 * un minuto (si hay vídeo, Gemini se lo mira entero). Antes eso te dejaba
 * mirando una pantalla de espera sin poder hacer nada. Ahora la promesa vive
 * aquí, fuera de cualquier componente, así que sobrevive a cambiar de pestaña
 * o cerrar el modal, y `ChefieBubble` la va contando en una esquina.
 *
 * **Límite honesto**: esto corre en la app, no en un servidor. Si el sistema la
 * suspende del todo, la petición en vuelo se corta. Contra eso hay dos defensas
 * aquí, y ninguna es magia:
 *
 * 1. Mientras dura el trabajo se impide que la pantalla se apague sola
 *    (`expo-keep-awake`). El bloqueo por inactividad era la forma habitual de
 *    perderlo: montar la semana tarda más que el tiempo de apagado de muchos
 *    móviles. Si se pulsa el botón de bloqueo a mano, esto no lo evita.
 *
 * 2. El trabajo en curso se deja anotado en disco. Si la app vuelve y la marca
 *    sigue ahí, es que se cortó a medias: se avisa y se ofrece reintentar, en
 *    vez de que desaparezca sin decir nada, que es lo que pasaba.
 *
 * Lo único que lo haría a prueba de todo es mover el trabajo al servidor (una
 * Cloud Function que escriba el resultado en Firestore); entonces daría igual
 * lo que haga el móvil. Es un cambio de arquitectura, no un parche.
 *
 * Un solo trabajo a la vez a propósito: dos cosas de IA en paralelo no pasan
 * casi nunca (hay cuota diaria) y una sola burbuja se entiende sin explicarla.
 */

/**
 * A dónde lleva la burbuja al tocarla cuando el trabajo termina bien. Es el
 * `Href` de expo-router para que las rutas tipadas sigan validándose: con un
 * `string` suelto, una ruta mal escrita solo se notaría al tocar la burbuja.
 */
export type JobTarget = Href;

export type BackgroundJob =
  | { status: 'working'; title: string }
  | { status: 'done'; title: string; cta: string; target: JobTarget }
  | {
      status: 'error';
      title: string;
      message: string;
      /**
       * A dónde mandar al usuario para que sepa qué hacer, si es que hay un
       * sitio. Lo usa el fallo de importar un enlace de Instagram/TikTok: el
       * mensaje explica el problema, y esto lleva al capítulo del Librito con
       * los pasos. Un error que solo dice "no ha podido ser" deja al usuario en
       * el mismo sitio que no decir nada.
       */
      target?: JobTarget;
      /** Texto del enlace del error. Solo tiene sentido junto a `target`. */
      cta?: string;
    };

let job: BackgroundJob | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/**
 * Marca en disco de "hay algo a medias". Se pone al empezar y se quita al
 * acabar, pase lo que pase. Si al arrancar sigue ahí, el trabajo murió con la
 * app: eso es justo lo que hay que contarle al usuario.
 */
const INFLIGHT_KEY = 'nutrilp.job.inflight';
const KEEP_AWAKE_TAG = 'nutrilp-job';

/** ¿Hay algo en marcha? Sirve para no lanzar dos a la vez. */
export function isJobRunning(): boolean {
  return job?.status === 'working';
}

/** Se sueltan los dos recursos a la vez: la marca y el bloqueo de pantalla. */
function releaseGuards() {
  void AsyncStorage.removeItem(INFLIGHT_KEY).catch(() => {});
  // `deactivateKeepAwake` peta si nunca se activó (p. ej. en web), y eso no
  // debe tumbar el cierre de un trabajo que ha ido bien.
  try {
    void Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
  } catch {
    /* no pasa nada */
  }
}

export function startJob(title: string) {
  job = { status: 'working', title };
  void AsyncStorage.setItem(INFLIGHT_KEY, title).catch(() => {});
  void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
  // Se pide el permiso AHORA para poder avisar al final: cuando el trabajo
  // termine, el usuario puede llevar rato en otra app.
  void primeJobNotifications();
  emit();
}

export function finishJob(title: string, cta: string, target: JobTarget) {
  job = { status: 'done', title, cta, target };
  releaseGuards();
  // `title` ya trae el nombre de la receta entre comillas — que es justamente
  // el dato que hace falta para encontrarla después.
  void notifyJobEnded(title, cta);
  emit();
}

export function failJob(title: string, message: string, ayuda?: { cta: string; target: JobTarget }) {
  job = { status: 'error', title, message, ...(ayuda ?? {}) };
  releaseGuards();
  // También cuando falla: enterarse de que NO hay receta importa tanto como lo
  // contrario, y si no se avisa el usuario la da por guardada.
  void notifyJobEnded(title, message);
  emit();
}

export function clearJob() {
  job = null;
  releaseGuards();
  emit();
}

/**
 * Al arrancar: si quedó una marca de trabajo a medias, se cuenta en qué quedó.
 *
 * **Primero se le pregunta al servidor.** Desde que la importación se guarda
 * ahí (`users/{uid}/importJobs/{jobId}`), que la app se muriera ya no significa
 * que el trabajo se perdiera: lo más probable es que terminara sin ella. Dar
 * por muerto algo que sí se guardó sería peor que no decir nada — mandaría al
 * usuario a importar dos veces la misma receta.
 *
 * Solo si no hay constancia de nada se cae al mensaje de "se cortó", que sigue
 * siendo el caso del autocompletado (ese sí vive dentro de la app).
 */
export async function recoverInterruptedJob(): Promise<void> {
  try {
    const pending = await AsyncStorage.getItem(INFLIGHT_KEY);
    if (!pending || job) return;
    await AsyncStorage.removeItem(INFLIGHT_KEY);

    const jobId = await lastJobId();
    if (jobId) {
      const remoto = await readJob(jobId);
      if (remoto?.status === 'done' && remoto.recipeName) {
        await forgetJob();
        job = {
          status: 'done',
          title: `Guardada como «${remoto.recipeName}»`,
          cta: 'Toca para abrirla.',
          // A la receta, no a la lista: ver el comentario de `destino` en import-job.
          target: remoto.recipeId
            ? { pathname: '/receta/[id]', params: { id: remoto.recipeId, global: '0' } }
            : { pathname: '/recetas' },
        };
        emit();
        return;
      }
      if (remoto?.status === 'error') {
        await forgetJob();
        job = { status: 'error', title: 'No ha podido ser', message: remoto.message ?? 'No se pudo importar la receta.' };
        emit();
        return;
      }
      if (remoto?.status === 'working') {
        // Se deja la marca puesta: al volver a abrir se preguntará otra vez.
        job = {
          status: 'working',
          title: `${remoto.label} (sigue en el servidor)`,
        };
        emit();
        return;
      }
    }

    job = {
      status: 'error',
      title: 'Se quedó a medias',
      message: `«${pending}» se cortó al cerrarse la app. No se ha guardado nada a medias: vuelve a lanzarlo cuando quieras.`,
    };
    emit();
  } catch {
    /* si el disco falla, mejor no molestar */
  }
}

export function useBackgroundJob(): BackgroundJob | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => job,
    () => job
  );
}
