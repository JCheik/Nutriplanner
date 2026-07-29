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

    resetShareIntent();
    if (url) router.push({ pathname: '/importar', params: { url } });
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}
