import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Aviso de "hay versión nueva".
 *
 * expo-updates busca y descarga la actualización al arrancar, pero NO la
 * aplica: se queda esperando al siguiente arranque. Sin este aviso hacen falta
 * dos aperturas para ver un cambio, y desde fuera parece que la app no se
 * actualiza nunca.
 *
 * Solo aparece con la descarga ya terminada (`isUpdatePending`), así que el
 * botón siempre hace algo: no se anuncia nada que todavía esté bajando.
 */
export function UpdateBanner() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const [reloading, setReloading] = useState(false);

  // `isEnabled` es false en desarrollo y en web, donde `reloadAsync` rechaza.
  if (!Updates.isEnabled || !isUpdatePending || dismissed) return null;

  const reload = async () => {
    if (reloading) return;
    setReloading(true);
    try {
      await Updates.reloadAsync();
    } catch {
      // Si no puede reiniciar, la actualización entra igual en el próximo
      // arranque. No merece la pena dar un error por algo que se arregla solo.
      setDismissed(true);
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
      <View style={[styles.bar, Shadows.card, { backgroundColor: c.terra }]}>
        <Pressable
          onPress={reload}
          disabled={reloading}
          style={styles.main}
          accessibilityRole="button"
          accessibilityLabel="Actualizar la app ahora"
        >
          <Ionicons name={reloading ? 'hourglass-outline' : 'arrow-down-circle'} size={17} color="#FFF" />
          <Text style={styles.text}>
            {reloading ? 'Actualizando…' : 'Hay una versión nueva. Toca para actualizar.'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Ahora no"
        >
          <Ionicons name="close" size={15} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, paddingHorizontal: 12 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.card,
    paddingLeft: 13,
    paddingRight: 9,
    paddingVertical: 10,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1, color: '#FFF', fontSize: 12.5, fontWeight: '700', fontFamily: Fonts.sans },
  close: { paddingLeft: 8 },
});
