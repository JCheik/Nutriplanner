import type { Href } from 'expo-router/build/typed-routes/types';
import { collection, getDocs } from 'firebase/firestore';

import { firestore } from '@/firebase';
import { importRecipeFromUrl, importRecipeFromVideo } from '@/firebase/ai-client';
import { failJob, finishJob, startJob } from '@/lib/background-job';
import { setPendingRecipe } from '@/lib/generated-recipe-store';
import { imageToDataUrl } from '@/lib/image-to-data-url';
import { forgetJob, newJobId, readJob, rememberJob, watchJob } from '@/lib/import-watch';
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

export type ImportInput = {
  url?: string;
  text?: string;
  /** URI local de una captura compartida; se convierte a data URL al lanzar. */
  imageUri?: string;
  /** URI local de un vídeo compartido. La MEJOR fuente: la receta está ahí. */
  videoUri?: string;
};

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
 * Importa en segundo plano. **El trabajo de verdad lo hace el servidor**: se le
 * manda un `jobId` y él guarda la receta y deja constancia en
 * `users/{uid}/importJobs/{jobId}`.
 *
 * Ese es el cambio que arregla el fallo de raíz. Antes la receta solo existía en
 * la respuesta HTTP, así que si Android suspendía la app —compartes un reel y
 * vuelves a Instagram— se perdía sin más. Ahora la app es un espectador: si se
 * muere, el servidor termina igual y la receta está puesta al volver.
 *
 * De ahí que se escuche también por Firestore y no solo por la respuesta: la
 * suscripción sobrevive a que la petición se corte a media descarga.
 *
 * El catálogo se lee aquí con una consulta suelta en vez de recibirlo por
 * parámetro: al llegar desde "Compartir", la pantalla se cierra enseguida y su
 * suscripción puede no haber traído nada todavía.
 */
/**
 * A dónde lleva el aviso al terminar: **a la receta**, no a la biblioteca.
 *
 * Llevaba a `/recetas`, que abre en "Mis recetas" ordenadas por NOMBRE — así que
 * lo recién importado caía en mitad del alfabeto y había que buscarlo. Justo en
 * el momento en que sabes menos de la receta (ni su nombre, que lo eligió la IA)
 * es cuando la lista menos ayuda. Con el id se abre directamente.
 */
function destino(recipeId?: string): Href {
  return recipeId ? { pathname: '/receta/[id]', params: { id: recipeId, global: '0' } } : { pathname: '/recetas' };
}

export async function runImportJob(input: ImportInput): Promise<void> {
  const jobId = newJobId();
  startJob(
    input.videoUri
      ? 'Viendo el vídeo…'
      : input.imageUri
        ? 'Leyendo la captura…'
        : input.url
          ? `Leyendo ${sourceName(input.url)}…`
          : 'Leyendo la receta…'
  );
  await rememberJob(jobId);

  // Si el servidor termina mientras la app sigue viva, esto se entera antes que
  // la respuesta y cierra la burbuja igual.
  const stop = watchJob(jobId, (job) => {
    if (job.status === 'done' && job.recipeName) {
      stop();
      void forgetJob();
      finishJob(`Guardada como "${job.recipeName}"`, 'Toca para abrirla.', destino(job.recipeId));
    } else if (job.status === 'error') {
      stop();
      void forgetJob();
      failJob('No ha podido ser', job.message ?? 'No se pudo importar la receta.');
    }
  });

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

    // ── VÍDEO: la mejor fuente, y la única que sirve en Instagram/TikTok ──
    // Va por su propio endpoint (multipart) porque el fichero no cabe
    // cómodamente en un JSON.
    if (input.videoUri) {
      const res = await importRecipeFromVideo({
        videoUri: input.videoUri,
        caption: input.text,
        existingIngredients,
        jobId,
      });
      stop();
      await forgetJob();
      if (res?.saved) {
        finishJob(`Guardada como "${res.saved.recipeName}"`, 'Toca para abrirla.', destino(res.saved.recipeId));
      } else if (res?.recipe) {
        // Servidor sin guardado (versión anterior): al camino de revisar a mano.
        setPendingRecipe(res.recipe);
        finishJob(`"${res.recipe.name}" lista`, 'Toca para revisarla y guardarla.', { pathname: '/receta-nueva' });
      } else {
        failJob('No ha podido ser', 'No he conseguido sacar una receta de ese vídeo.');
      }
      return;
    }

    // La captura se convierte aquí, no en la pantalla: al llegar desde
    // "Compartir" esa pantalla se cierra enseguida y se llevaría el trabajo.
    let imageBase64: string | undefined;
    if (input.imageUri) {
      try {
        imageBase64 = await imageToDataUrl(input.imageUri);
      } catch {
        stop();
        await forgetJob();
        failJob('No pude abrir esa imagen', 'Prueba a compartirla otra vez, o pega el texto de la receta.');
        return;
      }
    }

    const result = await importRecipeFromUrl({
      url: input.url,
      text: input.text,
      imageBase64,
      existingIngredients,
      jobId,
    });
    stop();
    await forgetJob();

    // La IA decidió que la foto era comida, no una receta: se manda al
    // analizador de nevera, que es lo que sabemos hacer con eso.
    if (result?.kind === 'nevera' && input.imageUri) {
      finishJob(
        'Eso parece tu nevera',
        'Toca y te propongo recetas con lo que hay.',
        { pathname: '/nevera', params: { shared: input.imageUri } }
      );
      return;
    }

    if (!result?.recipe) {
      failJob('No ha podido ser', 'No he conseguido sacar una receta de ahí.');
      return;
    }

    /**
     * Sin `saved`, el servidor NO la ha guardado — es una versión anterior a
     * esto, o el guardado falló. Entonces se vuelve al camino de siempre
     * (revisar y guardar a mano) en vez de cantar "Guardada como…", que sería
     * mentira. Importa durante la ventana en la que la web aún se está
     * desplegando y la app ya trae el `jobId`.
     */
    if (!result.saved) {
      setPendingRecipe(result.recipe);
      finishJob(`"${result.recipe.name}" lista`, 'Toca para revisarla y guardarla.', { pathname: '/receta-nueva' });
      return;
    }

    finishJob(`Guardada como "${result.saved.recipeName}"`, 'Toca para abrirla.', destino(result.saved.recipeId));
  } catch (e) {
    /**
     * Que la PETICIÓN falle ya no significa que la importación haya fallado: el
     * servidor puede estar terminándola. Se pregunta por el trabajo antes de
     * dar malas noticias — decir "no ha podido ser" de una receta que sí se
     * guardó es peor que tardar un segundo más en responder.
     */
    const job = await readJob(jobId);
    stop();
    if (job?.status === 'done' && job.recipeName) {
      await forgetJob();
      finishJob(`Guardada como "${job.recipeName}"`, 'Toca para abrirla.', destino(job.recipeId));
      return;
    }
    if (job?.status === 'working') {
      // Sigue en marcha ahí fuera: la marca se queda para que al reabrir la app
      // se pregunte de nuevo en qué quedó.
      finishJob('Sigue en marcha', 'La estoy terminando en el servidor; aparecerá en tus recetas.', { pathname: '/recetas' });
      return;
    }
    await forgetJob();
    failJob('No ha podido ser', e instanceof Error ? e.message : 'No se pudo importar la receta.');
  }
}
