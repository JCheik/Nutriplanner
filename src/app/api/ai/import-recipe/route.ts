import { importRecipe } from '@/ai/flows/import-recipe-flow';
import { fetchSocialMetadata, SocialUrlError } from '@/lib/social-url';
import { analyzeVideoFromUrl } from '@/lib/video-recipe';

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
}

/**
 * Corta cuando lo compartido no iba de cocina.
 *
 * El modelo ahora puede decir `esReceta: false` (ver los prompts). Sin esto,
 * como el esquema exige una receta, se inventaba una: le pasó al usuario con un
 * reel que no tenía nada que ver con comida.
 */
function assertIsRecipe(result: { esReceta?: boolean; motivoNoReceta?: string; name?: string }) {
  // Ausente = respuesta anterior al campo; se da por buena.
  if (result?.esReceta === false) {
    const motivo = result.motivoNoReceta?.trim();
    throw new AiEndpointError(
      `Eso no parece una receta${motivo ? `: ${motivo}` : ''}. Pásame algo donde se vea qué lleva y cómo se hace.`
    );
  }
  return result;
}

/**
 * Importar una receta en UNA llamada, para la app nativa: acepta un enlace de
 * redes o un texto pegado, y devuelve la receta lista para revisar.
 *
 * La web hace lo mismo en varios pasos desde el cliente (leer el post, decidir
 * si hay vídeo, analizarlo, y si no tirar del texto); aquí se une porque el
 * móvil no debe encadenar llamadas ni conocer el proceso.
 *
 * Orden de preferencia, el mismo que la web:
 *   1. Si el post trae vídeo → se analiza el vídeo (es donde está la receta de
 *      verdad en Instagram y TikTok; el pie de foto suele ser marketing).
 *   2. Si no hay vídeo, o su análisis falla → título + descripción del post.
 *   3. Si lo compartido era texto suelto → ese texto.
 */
export function POST(req: Request) {
  return runAiEndpoint<ImportInput>(
    req,
    async ({ url, text, existingIngredients }) => {
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
          // Si el vídeo no era de cocina, se corta aquí: NO se cae al pie de
          // foto, que es justo de donde salía la receta inventada.
          if (recipe?.esReceta === false) assertIsRecipe(recipe);
          return { recipe, imageUrl: meta.imageUrl, source: 'video' };
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

      const recipe = assertIsRecipe(await importRecipe({ url, caption, existingIngredients }));
      return { recipe, imageUrl: meta.imageUrl, source: 'texto' };
    },
    'No se pudo importar la receta.'
  );
}
