import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot } from '@/components/chefie-mascot';
import { PaperTexture } from '@/components/paper-texture';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * "Nueva receta": elegir CÓMO.
 *
 * Antes este botón llevaba directo a la IA, y los otros dos caminos vivían en
 * una fila de enlaces diminutos debajo del buscador. Resultado: la gente no
 * sabía que se podía pegar una URL, ni que se podía compartir desde Instagram,
 * ni que se podía escribir la receta a mano buscando alimentos del catálogo.
 * Los tres caminos existían; lo que faltaba era verlos.
 */
export default function RecetaCrearScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const options: {
    key: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    tone: 'terra' | 'sage';
    title: string;
    hint: string;
    onPress: () => void;
  }[] = [
    {
      key: 'ia',
      icon: 'sparkles',
      tone: 'terra',
      title: 'Que la monte Chefie',
      hint: 'Descríbela con tus palabras («cena rápida de menos de 500 kcal») y te la monto con sus macros.',
      onPress: () => router.replace('/receta-ia'),
    },
    {
      key: 'enlace',
      icon: 'link',
      tone: 'sage',
      title: 'De un enlace o compartida',
      hint: 'Pega la URL de cualquier web de recetas, un reel, un TikTok o un YouTube. También puedes compartirla desde esa app: Compartir → Nutrilp.',
      onPress: () => router.replace('/importar'),
    },
    {
      key: 'mano',
      icon: 'create',
      tone: 'sage',
      title: 'A mano, ingrediente a ingrediente',
      hint: 'Busca los alimentos en el catálogo y ve viendo cómo suben las calorías y los macros según los añades.',
      onPress: () => router.replace('/receta-editar'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <PaperTexture />
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 25, color: c.ink, fontFamily: Fonts.serif }}>Nueva receta</Text>
          <Text style={{ fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Tres formas. Elige la que te venga bien.
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={17} color={c.inkSoft} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {options.map((o) => {
          const fg = o.tone === 'terra' ? c.terra : c.sage;
          const bg = o.tone === 'terra' ? c.terraSoft : c.sageSoft;
          return (
            <Pressable
              key={o.key}
              onPress={o.onPress}
              style={[styles.card, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}
              accessibilityRole="button"
              accessibilityLabel={o.title}
            >
              <View style={[styles.badge, { backgroundColor: bg }]}>
                <Ionicons name={o.icon} size={20} color={fg} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>
                  {o.title}
                </Text>
                <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 17.5 }}>
                  {o.hint}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.inkSoft} />
            </Pressable>
          );
        })}

        {/* El «Compartir → Nutrilp» es lo que menos se descubre solo: no está en
            ninguna pantalla de la app, está en el menú de OTRA app. */}
        <View style={[styles.tip, { borderColor: c.line, backgroundColor: c.chip }]}>
          <ChefieMascot pose="point" size={62} flip />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>
              Ni hace falta abrir Nutrilp
            </Text>
            <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 17 }}>
              Cuando veas una receta en Instagram, TikTok o el navegador, dale al botón de compartir de esa app,
              busca Nutrilp en la lista y ya está: me pongo con ella y te aviso cuando la tenga.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingBottom: 12 },
  closeBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: Radii.panel,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 4,
  },
});
