import { importRecipe } from '@/ai/flows/import-recipe-flow';
import { fetchSocialMetadata, SocialUrlError } from '@/lib/social-url';
import { analyzeVideoFromUrl } from '@/lib/video-recipe';

import { failImportJob, finishImportJob, startImportJob } from '@/lib/import-persist';

import { AiEndpointError, corsPreflight, runAiEndpoint } from '../_shared';

export const OPTIONS = corsPreflight;

// El análisis de vídeo puede tardar: Gemini tiene que ver el clip entero.
export const maxDuration = 120;

interface ImportInput {
  /** Enlace de Instagram, TikTok, YouTube… */
  url?: string;
  /** Texto suelto compartido (una receta pegada, sin enlace). */
  text?: string;
  /** Nombres del catálogo, para que la IA reutilice alimentos en vez de duplicarlos. */
  existingIngredients?: string[];
  /**
   * Id del trabajo, puesto por la app. Con él, el servidor **guarda la receta y
   * deja constancia** en `users/{uid}/importJobs/{jobId}` en vez de limitarse a
   * devolverla — así la importación sobrevive a que el móvil se muera a medias,
   * que es lo que pasaba al compartir un reel y volver a Instagram.
   *
   * Opcional a propósito: sin él el endpoint se comporta como siempre, así que
   * una app vieja que aún no lo mande sigue funcionando igual.
   */
  jobId?: string;
}

/**
 * Corta cuando lo compartido no iba de cocina.
 *
 * El modelo ahora puede decir `esReceta: false` (ver los prompts). Sin esto,
 * como el esquema exige una receta, se inventaba una: le pasó al usuario con un
 * reel que no tenía nada que ver con comida.
 */
function assertIsRecipe(
  result: { esReceta?: boolean; motivoNoReceta?: string; name?: string },
  /** Si antes de esto ya se había mirado el vídeo y tampoco salió receta. */
  alsoCheckedVideo = false
) {
  // Ausente = respuesta anterior al campo; se da por buena.
  if (result?.esReceta === false) {
    const motivo = result.motivoNoReceta?.trim();
    // Decir que se miraron las dos fuentes evita la duda razonable de "¿habrá
    // leído el pie, donde estaba la receta?".
    const alcance = alsoCheckedVideo ? 'Ni en el vídeo ni en el texto encuentro una receta' : 'Eso no parece una receta';
    throw new AiEndpointError(
      `${alcance}${motivo ? `: ${motivo}` : ''}. Pásame algo donde se vea qué lleva y cómo se hace.`
    );
  }
  return result;
}

/**
 * Saca la receta de donde esté. Sin saber nada de guardarla ni de dejar
 * constancia: de eso se encarga el POST, que es quien conoce el `jobId`.
 *
 * La web hace lo mismo en varios pasos desde el cliente (leer el post, decidir
 * si hay vídeo, analizarlo, y si no tirar del texto); aquí se une porque el
 * móvil no debe encadenar llamadas ni conocer el proceso.
 *
 * Orden de preferencia, el mismo que la web:
 *   1. Si la página publica la receta estructurada (JSON-LD) → eso.
 *   2. Si el post trae vídeo → se analiza el vídeo (es donde está la receta de
 *      verdad en Instagram y TikTok; el pie de foto suele ser marketing).
 *   3. Si no hay vídeo, su análisis falla, **o el vídeo resulta no ser una
 *      receta** → título + descripción del post. Ese último caso es real: hay
 *      publicaciones donde el clip es solo el plato terminado y los
 *      ingredientes y pasos van escritos debajo.
 *   4. Si lo compartido era texto suelto → ese texto.
 *
 * Solo se rechaza cuando NINGUNA de las fuentes disponibles trae una receta.
 */
async function doImport({ url, text, existingIngredients }: ImportInput) {
  // ── Texto pegado, sin enlace ──────────────────────────────────────
  if (!url) {
    const caption = (text ?? '').trim();
    if (caption.length < 20) {
      throw new AiEndpointError('Necesito algo más de texto para sacar una receta de ahí.');
    }
    const recipe = assertIsRecipe(await importRecipe({ caption, existingIngredients }));
    return { recipe, imageUrl: null, source: 'texto' };
  }

  // ── Enlace de redes ───────────────────────────────────────────────
  let videoDescartado = false;
  let meta;
  try {
    meta = await fetchSocialMetadata(url);
  } catch (e) {
    if (e instanceof SocialUrlError) throw new AiEndpointError(e.message, e.status);
    throw new AiEndpointError('No se pudo leer ese enlace. Puede que la publicación sea privada.', 502);
  }

  const caption = [meta.title, meta.description, text].filter(Boolean).join('\n\n').trim();

  // ── Web de recetas con JSON-LD ────────────────────────────────────
  // Va ANTES del vídeo: si la página publica la receta estructurada, eso
  // es la fuente buena. Un blog con vídeo incrustado tiene los pasos
  // escritos, y leerlos sale mejor y más barato que mirar el clip.
  if (meta.recipeText) {
    const recipe = assertIsRecipe(
      await importRecipe({ url, caption: meta.recipeText, existingIngredients })
    );
    return { recipe, imageUrl: meta.imageUrl, source: 'web' };
  }

  if (meta.videoUrl) {
    try {
      const recipe = await analyzeVideoFromUrl(meta.videoUrl, caption, existingIngredients);
      if (recipe?.esReceta === false) {
        /**
         * El vídeo no enseñaba una receta. Antes esto cortaba en seco, sin
         * mirar el pie de foto — y hay publicaciones en las que la receta
         * está justo ahí: el vídeo es el plato terminado o alguien
         * comiendo, y los ingredientes y los pasos van escritos debajo. Al
         * usuario le pasó con un reel de Instagram.
         *
         * El corte se puso cuando el esquema OBLIGABA a devolver receta y el
         * modelo se la inventaba. Ese agujero ya no existe: el camino del
         * texto tiene su propio `esReceta`, así que si el pie tampoco es una
         * receta, se rechaza igual, solo que después de haberlo mirado.
         */
        if (!caption) assertIsRecipe(recipe);
        videoDescartado = true;
        console.info('[import-recipe] el vídeo no era receta; se prueba el pie de foto');
      } else {
        return { recipe, imageUrl: meta.imageUrl, source: 'video' };
      }
    } catch (e) {
      if (e instanceof AiEndpointError) throw e;
      // Las URLs de vídeo de Instagram/TikTok caducan y a menudo Gemini no
      // puede descargarlas. No es motivo para fallar: se sigue con el texto.
      console.warn('[import-recipe] video analysis failed, falling back to caption:', e);
    }
  }

  if (!caption) {
    throw new AiEndpointError(
      'Ese enlace no trae texto que leer. Si la publicación es privada, copia la receta y compártela como texto.'
    );
  }

  const recipe = assertIsRecipe(await importRecipe({ url, caption, existingIngredients }), videoDescartado);
  return { recipe, imageUrl: meta.imageUrl, source: videoDescartado ? 'texto (el vídeo no era receta)' : 'texto' };
}

/** "Leyendo Instagram…", para que la app no tenga que deducirlo del enlace. */
function jobLabel(input: ImportInput): string {
  if (!input.url) return 'Leyendo la receta…';
  try {
    const host = new URL(input.url).hostname.replace(/^www\./, '');
    if (host.includes('instagram')) return 'Leyendo Instagram…';
    if (host.includes('tiktok')) return 'Leyendo TikTok…';
    if (host.includes('youtu')) return 'Leyendo YouTube…';
    return `Leyendo ${host}…`;
  } catch {
    return 'Leyendo la receta…';
  }
}

export function POST(req: Request) {
  return runAiEndpoint<ImportInput>(
    req,
    async (body, uid) => {
      const { jobId } = body;

      // Sin jobId: comportamiento de siempre, la app espera la respuesta.
      if (!jobId) return doImport(body);

      await startImportJob(uid, jobId, jobLabel(body));
      try {
        const out = await doImport(body);
        // Guardar y cerrar el trabajo ocurre AQUÍ, dentro de la petición: en
        // Cloud Run la CPU solo está garantizada mientras la petición sigue en
        // vuelo, así que "responder y seguir trabajando" no sería fiable.
        const saved = await finishImportJob(uid, jobId, out.recipe, {
          imageUrl: out.imageUrl,
          // El enlace del post: la ficha de receta lo enseña para volver al original.
          ...(body.url ? { sourceUrl: body.url } : {}),
        });
        return { ...out, saved };
      } catch (e) {
        await failImportJob(
          uid,
          jobId,
          e instanceof AiEndpointError ? e.message : 'No se pudo importar la receta.'
        );
        throw e;
      }
    },
    'No se pudo importar la receta.'
  );
}
