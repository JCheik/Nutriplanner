import { importRecipe } from '@/ai/flows/import-recipe-flow';
import { fetchSocialMetadata, SocialUrlError } from '@/lib/social-url';

import { AiEndpointError, corsPreflight, runAiEndpoint } from '../_shared';

export const OPTIONS = corsPreflight;

interface ImportFromUrlInput {
  url: string;
  /** Nombres del catálogo, para que la IA reutilice alimentos en vez de duplicarlos. */
  existingIngredients?: string[];
}

/**
 * Importar una receta desde un enlace, en UNA llamada. Lo usa la app nativa
 * cuando compartes un post de Instagram o TikTok desde la propia red social.
 *
 * La web hace este mismo trabajo en dos pasos desde el cliente
 * (`/api/fetch-social-url` y luego el flow como Server Action); aquí se une
 * porque el móvil no debe encadenar llamadas ni conocer el proceso.
 *
 * Diferencia consciente con la web: **no se analiza el vídeo**. Ese camino
 * (`/api/analyze-video`) descarga el vídeo entero y lo manda a Gemini, que es
 * caro y lento para un gesto que debe sentirse instantáneo. Se importa del
 * título y la descripción del post, que es el mismo camino de respaldo que usa
 * la web cuando no hay vídeo analizable.
 */
export function POST(req: Request) {
  return runAiEndpoint<ImportFromUrlInput>(
    req,
    async ({ url, existingIngredients }) => {
      let meta;
      try {
        meta = await fetchSocialMetadata(url);
      } catch (e) {
        if (e instanceof SocialUrlError) throw new AiEndpointError(e.message, e.status);
        throw new AiEndpointError('No se pudo leer ese enlace. Puede que la publicación sea privada.', 502);
      }

      const caption = [meta.title, meta.description].filter(Boolean).join('\n\n').trim();
      if (!caption) {
        throw new AiEndpointError(
          'Ese enlace no trae texto que leer. Si la publicación es privada, copia la receta y pégala en la web.'
        );
      }

      const recipe = await importRecipe({ url, caption, existingIngredients });
      return { recipe, imageUrl: meta.imageUrl };
    },
    'No se pudo importar la receta de ese enlace.'
  );
}
