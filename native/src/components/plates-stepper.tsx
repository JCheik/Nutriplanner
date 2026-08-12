import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MAX_PLATES_PER_SLOT } from '@/lib/constants';

/**
 * Cuántos platos de una receta hay en un hueco. Entero, y nada que teclear.
 *
 * Sustituye al campo escribible de raciones: el tamaño de cada plato ya lo pone
 * el factor de ración del perfil, así que aquí solo se cuenta. El − se apaga en
 * 1 (quitar del plan es la papelera, no bajar a cero) y el + en el tope, que
 * antes no existía y dejaba llegar a «12 raciones» de un yogur.
 */
export function PlatesStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const c = useTheme();
  const atMin = value <= 1;
  const atMax = value >= MAX_PLATES_PER_SLOT;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={atMin}
        style={[styles.btn, { borderColor: c.line, opacity: atMin ? 0.35 : 1 }]}
        accessibilityRole="button"
        accessibilityState={{ disabled: atMin }}
        accessibilityLabel={`Un plato menos de ${label}`}
      >
        <Ionicons name="remove" size={14} color={c.inkSoft} />
      </Pressable>

      <Text
        style={[styles.value, { color: c.ink, fontFamily: Fonts.serif }]}
        accessibilityLabel={`${value} ${value === 1 ? 'plato' : 'platos'} de ${label}`}
      >
        {value}
      </Text>

      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={atMax}
        style={[styles.btn, { borderColor: c.line, opacity: atMax ? 0.35 : 1 }]}
        accessibilityRole="button"
        accessibilityState={{ disabled: atMax }}
        accessibilityLabel={`Un plato más de ${label}`}
      >
        <Ionicons name="add" size={14} color={c.inkSoft} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 16, textAlign: 'center', fontSize: 17, fontWeight: '700' },
});
