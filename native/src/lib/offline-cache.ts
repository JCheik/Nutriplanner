import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Caché local de lectura, para que la app enseñe algo sin cobertura — el caso
 * de uso es literal: estar en el súper con la lista de la compra y sin datos.
 *
 * Por qué a mano y no la persistencia de Firestore: la app usa el SDK de
 * **JavaScript**, cuya caché de disco va sobre IndexedDB, que no existe en
 * React Native. Ahí el SDK se queda en memoria y al reabrir la app no hay nada.
 * La alternativa real sería `react-native-firebase` (módulo nativo, otra
 * compilación y migrar todas las llamadas), desproporcionado para esto.
 *
 * Es solo caché de LECTURA: las escrituras siguen necesitando conexión. Y es
 * una copia de datos que el usuario ya tiene en su cuenta, guardada en su
 * propio dispositivo; se borra al cerrar sesión (ver `clearOfflineCache`).
 */
const PREFIX = 'nutrilp.cache.';

/** La clave lleva el uid: dos cuentas en el mismo móvil no se pisan los datos. */
function key(name: string, uid: string) {
  return `${PREFIX}${uid}.${name}`;
}

export async function readCache<T>(name: string, uid: string | undefined): Promise<T | null> {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(key(name, uid));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Escribe sin esperar: si falla, la próxima vez simplemente no habrá caché. */
export function writeCache<T>(name: string, uid: string | undefined, value: T): void {
  if (!uid) return;
  AsyncStorage.setItem(key(name, uid), JSON.stringify(value)).catch(() => {});
}

/** Al cerrar sesión no debe quedar el plan de nadie en el disco. */
export async function clearOfflineCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    /* si falla, no es crítico: son datos del propio usuario en su móvil */
  }
}
