import type { GeneratedRecipe } from '@/firebase/ai-client';

/**
 * Traspaso en memoria de la receta que acaba de generar la IA, del asistente a
 * la pantalla de revisión. Va por aquí y no por params de ruta porque una
 * receta entera no cabe cómodamente en la URL (y en web se vería en la barra).
 * De un solo uso: la pantalla la consume al abrirse.
 */
let pending: GeneratedRecipe | null = null;

export function setPendingRecipe(recipe: GeneratedRecipe) {
  pending = recipe;
}

export function takePendingRecipe(): GeneratedRecipe | null {
  const r = pending;
  pending = null;
  return r;
}
