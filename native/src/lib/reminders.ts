import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Recordatorios que escribe el usuario: "descongela el pollo", "prepara el
 * táper de mañana".
 *
 * Son notificaciones LOCALES: las programa el móvil y las lanza él, sin
 * servidor, sin coste y sin necesitar internet. La contrapartida es que solo
 * existen en ESE teléfono, por eso el texto se guarda además en el perfil: al
 * reinstalar o cambiar de móvil se vuelven a programar desde ahí.
 */

export type ReminderRepeat = 'diario' | 'semanal';

export interface Reminder {
  /** Id propio, estable. No es el de expo-notifications, que cambia al reprogramar. */
  id: string;
  text: string;
  hour: number;
  minute: number;
  repeat: ReminderRepeat;
  /** 0 = lunes … 6 = domingo. Solo cuando `repeat` es 'semanal'. */
  weekday?: number;
  enabled: boolean;
}

export const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * expo-notifications cuenta las semanas al estilo Calendar: 1 = domingo.
 * Aquí se guardan como 0 = lunes, que es como se lee una semana en español.
 */
function toExpoWeekday(mondayBased: number): number {
  return mondayBased === 6 ? 1 : mondayBased + 2;
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function describeReminder(r: Reminder): string {
  const when = formatTime(r.hour, r.minute);
  return r.repeat === 'diario'
    ? `Todos los días a las ${when}`
    : `Cada ${WEEKDAY_LABELS[r.weekday ?? 0].toLowerCase()} a las ${when}`;
}

/** Canal de Android. Sin esto las notificaciones salen sin sonido ni prioridad. */
export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('recordatorios', {
    name: 'Recordatorios',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#D9531F',
  });
}

/** Pide permiso si no lo hay. Devuelve si se puede notificar. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Reprograma TODO desde cero a partir de la lista guardada.
 *
 * Se borra y se vuelve a poner en vez de ir sincronizando uno a uno: los ids
 * de expo no sobreviven a un reinicio del sistema en todos los móviles, y
 * cuadrar dos listas que pueden haber divergido es más frágil que rehacerlas.
 * Son cuatro o cinco avisos, no cuesta nada.
 */
export async function rescheduleAll(reminders: Reminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannel();

  for (const r of reminders) {
    if (!r.enabled || !r.text.trim()) continue;
    const content = {
      title: 'Chefie te recuerda',
      body: r.text.trim(),
      // El icono y su color van en el plugin (app.json): Android obliga a que
      // el de la barra de estado sea monocromo, así que es la silueta del gorro.
      color: '#D9531F',
    };
    const trigger =
      r.repeat === 'diario'
        ? { type: Notifications.SchedulableTriggerInputTypes.DAILY as const, hour: r.hour, minute: r.minute }
        : {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY as const,
            weekday: toExpoWeekday(r.weekday ?? 0),
            hour: r.hour,
            minute: r.minute,
          };
    await Notifications.scheduleNotificationAsync({ content, trigger });
  }
}

/** Cuántos avisos hay puestos ahora mismo en el sistema. Para depurar. */
export async function scheduledCount(): Promise<number> {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}
