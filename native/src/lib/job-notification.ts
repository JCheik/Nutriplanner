import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

/**
 * Aviso del sistema cuando un trabajo de fondo termina y **no estás mirando la
 * app**.
 *
 * `ChefieBubble` ya cuenta el progreso, pero solo sirve si tienes Nutrilp
 * delante. El caso real es el contrario: compartes un reel desde Instagram,
 * Nutrilp se abre un segundo, lanza la importación y tú vuelves a Instagram.
 * Ahí la burbuja no la ve nadie, y al usuario le pasó exactamente eso — se
 * quedó sin saber si la receta había salido, y con qué nombre.
 *
 * El nombre va EN el título del aviso a propósito: es el único dato con el que
 * luego se puede encontrar la receta entre las demás.
 *
 * Canal propio (no el de `recordatorios`) para que se puedan silenciar por
 * separado desde los ajustes de Android: no es lo mismo un recordatorio de
 * cocinar que el acuse de una importación.
 */
const CHANNEL = 'importaciones';

/** En web no hay notificaciones nativas y la API peta; se ignora en silencio. */
const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Importaciones',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 150, 200],
    lightColor: '#D9531F',
  });
}

/**
 * Pide permiso **al empezar** el trabajo, no al terminarlo.
 *
 * Es el momento honesto: el usuario acaba de compartir algo a Nutrilp, así que
 * un aviso de "te avisaré cuando esté" encaja. Pedirlo al final llegaría tarde
 * para esa misma importación. Si lo deniega, `canAskAgain` pasa a false y no se
 * vuelve a preguntar: no hay insistencia.
 */
export async function primeJobNotifications(): Promise<void> {
  if (!SUPPORTED) return;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return;
    if (!current.canAskAgain) return;
    await Notifications.requestPermissionsAsync();
  } catch {
    /* sin permiso simplemente no habrá aviso */
  }
}

/**
 * Lanza el aviso, salvo que la app esté en primer plano — ahí ya está la
 * burbuja, y duplicar el mensaje solo molesta.
 */
export async function notifyJobEnded(title: string, body: string): Promise<void> {
  if (!SUPPORTED) return;
  if (AppState.currentState === 'active') return;
  try {
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      // El icono monocromo y su color los pone el plugin en app.json.
      content: { title, body, color: '#D9531F' },
      /**
       * `null` = ahora mismo. En Android el canal NO va en `content` —ahí se
       * ignora y el aviso cae en el canal por defecto, perdiendo la vibración
       * propia y la posibilidad de silenciarlo aparte—: va en el trigger, que
       * para eso existe `ChannelAwareTriggerInput` (entrega inmediata + canal).
       * Comprobado en los docs de Expo SDK 57.
       */
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
  } catch {
    /* que un aviso falle no puede tumbar el trabajo, que sí ha terminado */
  }
}
