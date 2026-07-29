import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'nutrilp.theme-preference';

/**
 * Aspecto de la app. Por defecto **claro**, como la web (que fuerza `light`):
 * el crema y la terracota son la identidad, y a un móvil en modo noche la app
 * le salía oscura sin haberlo pedido. Quien quiera oscuro lo elige en Perfil.
 *
 * La preferencia es del dispositivo (AsyncStorage), no del perfil de Firestore:
 * no necesita conexión, ni reglas, ni escribir en la nube para algo tan local.
 */
interface ThemePreferenceValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  scheme: 'light' | 'dark';
}

const ThemePreferenceContext = createContext<ThemePreferenceValue>({
  preference: 'light',
  setPreference: () => {},
  scheme: 'light',
});

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const system = useSystemColorScheme();
  // Arranca en claro: si lo guardado fuese 'dark' se aplica en cuanto resuelve
  // AsyncStorage, y así nunca hay un parpadeo de oscuro a claro.
  const [preference, setStored] = useState<ThemePreference>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setStored(v);
      })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setStored(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(() => ({ preference, setPreference, scheme }), [preference, setPreference, scheme]);

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}

/** Claro u oscuro ya resuelto (preferencia + sistema). Úsalo en vez de `useColorScheme`. */
export function useResolvedScheme(): 'light' | 'dark' {
  return useContext(ThemePreferenceContext).scheme;
}
