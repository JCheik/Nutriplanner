import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useShareIntent } from 'expo-share-intent';

/**
 * Recoge lo que se comparte con Nutrilp desde otra app (el "Compartir" de
 * Instagram o TikTok) y lo lleva a la pantalla de importación.
 *
 * Solo se monta con sesión iniciada: sin usuario no hay token para llamar a la
 * IA, y así el enlace no se pierde antes de que el usuario entre — al terminar
 * el login este componente se monta y el intent sigue disponible.
 *
 * Existe un `share-intent-handler.web.tsx` que no hace nada: la librería es
 * nativa y en Expo web (el preview de diseño) reventaría.
 */
export function ShareIntentHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({ resetOnBackground: true });

  useEffect(() => {
    if (!hasShareIntent) return;

    // Instagram/TikTok mandan la URL en `webUrl`; algunas apps la meten dentro
    // del texto suelto, así que se rescata de ahí como respaldo.
    const url = shareIntent.webUrl ?? shareIntent.text?.match(/https?:\/\/\S+/)?.[0] ?? null;
    const image = shareIntent.files?.find((f) => f.mimeType?.startsWith('image/'))?.path ?? null;
    const text = shareIntent.text ?? null;

    resetShareIntent();

    // Prioridad: enlace > imagen > texto suelto. Una foto compartida va al
    // análisis de nevera, que es lo que sabemos hacer con una imagen de comida;
    // un texto sin enlace se intenta importar como receta pegada.
    if (url) {
      router.push({ pathname: '/importar', params: { url } });
    } else if (image) {
      // Antes iba directa al analizador de NEVERA. Pero la captura de un reel es
      // la única forma de importar de Instagram (el enlace no da nada), y esa es
      // la razón principal por la que se comparte una imagen con Nutrilp. Ahora
      // va a importar, y si la IA ve que era comida suelta y no una receta, el
      // propio trabajo la reencamina a la nevera.
      router.push({ pathname: '/importar', params: { image } });
    } else if (text && text.trim().length >= 20) {
      router.push({ pathname: '/importar', params: { text } });
    }
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}
