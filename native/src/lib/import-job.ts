import { collection, getDocs } from 'firebase/firestore';

import { firestore } from '@/firebase';
import { importRecipeFromUrl } from '@/firebase/ai-client';
import { failJob, finishJob, startJob } from '@/lib/background-job';
import { setPendingRecipe } from '@/lib/generated-recipe-store';
import type { BaseIngredient } from '@/lib/types';

/** De dónde viene el enlace, solo para que el mensaje suene concreto. */
export function sourceName(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('instagram')) return 'Instagram';
  if (u.includes('tiktok')) return 'TikTok';
  if (u.includes('youtu')) return 'YouTube';
  if (u.includes('pinterest')) return 'Pinterest';
  if (u.includes('facebook')) return 'Facebook';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'ese enlace';
  }
}

export type ImportInput = { url?: string; text?: string };

/**
 * Convierte lo que haya escrito el usuario en algo que el endpoint entienda.
 * Un enlace suelto va como `url`; si ha pegado la receta entera, como `text`.
 */
export function parseImportInput(raw: string): ImportInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/https?:\/\/\S+/);
  if (match) return { url: match[0] };
  if (trimmed.length >= 20) return { text: trimmed };
  return null;
}

/**
 * Importa en segundo plano: se lanza y no se espera. Vive fuera de cualquier
 * componente a propósito, para que cerrar el modal o cambiar de pestaña no
 * cancele nada — el progreso se sigue por `ChefieBubble`.
 *
 * El catálogo se lee aquí con una consulta suelta en vez de recibirlo por
 * parámetro: al llegar desde "Compartir", la pantalla se cierra enseguida y su
 * suscripción puede no haber traído nada todavía.
 */
export async function runImportJob(input: ImportInput): Promise<void> {
  startJob(input.url ? `Leyendo ${sourceName(input.url)}…` : 'Leyendo la receta…');
  try {
    let existingIngredients: string[] = [];
    try {
      const snap = await getDocs(collection(firestore, 'ingredients'));
      existingIngredients = snap.docs
        .map((d) => (d.data() as BaseIngredient).name)
        .filter((n): n is string => !!n);
    } catch {
      // Sin catálogo la IA puede duplicar algún alimento, pero la importación
      // sigue siendo útil. No es motivo para abortar.
    }

    const result = await importRecipeFromUrl({ ...input, existingIngredients });
    if (!result?.recipe) {
      failJob('No ha podido ser', 'No he conseguido sacar una receta de ahí.');
      return;
    }

    setPendingRecipe(result.recipe);
    finishJob(`"${result.recipe.name}" lista`, 'Toca para revisarla y guardarla.', { pathname: '/receta-nueva' });
  } catch (e) {
    failJob('No ha podido ser', e instanceof Error ? e.message : 'No se pudo importar la receta.');
  }
}
