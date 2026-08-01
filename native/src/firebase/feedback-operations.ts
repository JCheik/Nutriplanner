import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { addDoc, collection } from 'firebase/firestore';

import { auth, firestore } from '@/firebase';

/**
 * Envío de reportes desde la app. Van a la colección `feedback` de Firestore,
 * que **solo lee el admin** desde `/admin/feedback` en la web.
 *
 * Se eligió esto en vez de abrir el correo del móvil: un `mailto` depende de
 * que el usuario tenga cuenta configurada, se pierde si no le da a enviar, y
 * llega sin contexto. Aquí el contexto (versión, móvil, pantalla) lo rellena la
 * app sola, que es la diferencia entre "no me funciona" y poder reproducirlo.
 */
export async function sendFeedback(message: string, screen?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'Inicia sesión para poder enviarlo.' };

  const text = message.trim();
  if (!text) return { ok: false, error: 'Escribe algo antes de enviar.' };
  // Mismo tope que las reglas de Firestore, para avisar aquí en vez de que el
  // servidor rechace la escritura sin explicación.
  if (text.length > 4000) return { ok: false, error: 'Demasiado largo: resúmelo un poco.' };

  const device = [Device.osName, Device.osVersion, Device.modelName].filter(Boolean).join(' ') || 'desconocido';

  try {
    await addDoc(collection(firestore, 'feedback'), {
      uid: user.uid,
      email: user.email ?? '',
      name: user.displayName ?? '',
      message: text,
      appVersion: Constants.expoConfig?.version ?? 'desconocida',
      device,
      ...(screen ? { screen } : {}),
      createdAt: Date.now(),
      handled: false,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.' };
  }
}
