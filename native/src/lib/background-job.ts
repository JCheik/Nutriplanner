import type { Href } from 'expo-router/build/typed-routes/types';
import { useSyncExternalStore } from 'react';

/**
 * Trabajos que siguen corriendo mientras navegas.
 *
 * Importar una receta o autocompletar la semana tardan entre unos segundos y
 * un minuto (si hay vídeo, Gemini se lo mira entero). Antes eso te dejaba
 * mirando una pantalla de espera sin poder hacer nada. Ahora la promesa vive
 * aquí, fuera de cualquier componente, así que sobrevive a cambiar de pestaña
 * o cerrar el modal, y `ChefieBubble` la va contando en una esquina.
 *
 * **Límite honesto**: esto solo corre con la app abierta. Si Android la manda a
 * dormir, el trabajo se queda parado hasta que vuelvas. Un aviso de verdad
 * necesitaría expo-notifications, que es módulo nativo y pide APK nueva.
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
  | { status: 'error'; title: string; message: string };

let job: BackgroundJob | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** ¿Hay algo en marcha? Sirve para no lanzar dos a la vez. */
export function isJobRunning(): boolean {
  return job?.status === 'working';
}

export function startJob(title: string) {
  job = { status: 'working', title };
  emit();
}

export function finishJob(title: string, cta: string, target: JobTarget) {
  job = { status: 'done', title, cta, target };
  emit();
}

export function failJob(title: string, message: string) {
  job = { status: 'error', title, message };
  emit();
}

export function clearJob() {
  job = null;
  emit();
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
