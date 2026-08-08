import { useState } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatServings, parseServings } from '@/lib/serving-utils';

/**
 * El número de raciones, escribible. Los botones ± van rápido para 1, 2, 3,
 * pero no llegan a «0,2 raciones de la olla», así que el valor se teclea.
 *
 * Lleva borrador propio: mientras se escribe NO se recorta ni se reformatea.
 * Sin eso no se puede llegar a «0,5» — al teclear el «0» se convertiría en el
 * mínimo y la coma nunca entraría. Se confirma al salir del campo, que además
 * deja una sola escritura en Firestore en vez de una por tecla.
 */
export function ServingsInput({
  value,
  onCommit,
  style,
  label,
}: {
  value: number;
  onCommit: (n: number) => void;
  style?: StyleProp<TextStyle>;
  label: string;
}) {
  const c = useTheme();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <TextInput
      value={draft ?? formatServings(value)}
      onFocus={() => setDraft(formatServings(value))}
      onChangeText={(t) => {
        // Solo dígitos y UN separador: el teclado decimal de Android deja meter
        // varias comas y `parseFloat` se quedaría con lo de delante sin avisar.
        const clean = t.replace(/[^0-9.,]/g, '').replace(/([.,])(?=.*[.,])/g, '');
        setDraft(clean);
        // Se confirma en cada tecla, no al salir del campo: si se teclean las
        // raciones y se cierra la hoja de golpe, con el blur se perderían.
        // Un campo vacío o ilegible deja las raciones como estaban.
        const parsed = parseServings(clean);
        if (parsed !== null) onCommit(parsed);
      }}
      // El blur solo limpia el borrador para que se repinte ya formateado.
      onBlur={() => setDraft(null)}
      keyboardType="decimal-pad"
      selectTextOnFocus
      maxLength={5}
      style={[styles.input, { color: c.ink, fontFamily: Fonts.serif }, style]}
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  input: { minWidth: 34, textAlign: 'center', fontSize: 17, fontWeight: '700', padding: 0 },
});
