import { useSyncExternalStore } from 'react';

import type { Meal, RecipeInstance } from '@/lib/types';

/**
 * Portapapeles del plan: copiar un día entero o una comida suelta y pegarlo en
 * otro sitio, que es la forma rápida de montar la semana ("los lunes y los
 * miércoles como lo mismo").
 *
 * Vive en memoria (se pierde al cerrar la app) y a propósito: es un gesto de
 * usar y tirar, no un dato que merezca guardarse en Firestore. Se expone con
 * `useSyncExternalStore` para que los botones de "Pegar" aparezcan solos en
 * todas las pantallas montadas en cuanto copias algo.
 */
export type PlanClipboard =
  | { kind: 'day'; label: string; meals: Meal[] }
  | { kind: 'meal'; label: string; dayLabel: string; recipes: RecipeInstance[] };

let content: PlanClipboard | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setPlanClipboard(next: PlanClipboard | null) {
  content = next;
  emit();
}

export function usePlanClipboard(): PlanClipboard | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => content,
    () => content
  );
}
