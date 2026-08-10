import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Descargo de "esto no es consejo médico", donde quiera que la app dé cifras de
 * calorías o macros. Puerto del `nutritional-disclaimer.tsx` de la web, con el
 * **mismo texto palabra por palabra**: es una promesa legal, y dos redacciones
 * distintas para las dos superficies solo dan oportunidades de contradecirse.
 *
 * En la app aparece en dos sitios, por dos motivos distintos:
 * - **Objetivos**, pegado al resultado — es donde nace la cifra, y donde alguien
 *   podría tomársela como una pauta clínica.
 * - **Pie de Perfil**, junto a los enlaces legales — el sitio fijo donde
 *   buscarlo si no estabas mirando la calculadora.
 */
export function NutritionalDisclaimer({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useTheme();

  return (
    <View style={[styles.root, style]}>
      <Ionicons
        name="information-circle-outline"
        size={14}
        color={c.inkSoft}
        // El icono es decorativo: el lector de pantalla ya lee el texto entero.
        style={styles.icon}
      />
      <Text style={[styles.text, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
        Nutrilp ofrece estimaciones orientativas y no constituye consejo médico ni nutricional
        profesional. Consulta con un profesional de la salud antes de cambiar tu dieta.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  // `flex: 1` para que el párrafo ocupe el ancho que queda y no empuje al icono.
  text: { flex: 1, fontSize: 11.5, lineHeight: 16 },
  icon: { marginTop: 1 },
});
