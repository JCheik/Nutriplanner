import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * "El Librito": guía de referencia, siempre disponible. Mismo contenido que la
 * web (`dashboard/librito`) — si se edita allí, actualizar aquí también.
 */
interface Chapter {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  intro?: string;
  bullets: { lead: string; text: string }[];
  outro?: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'redes',
    icon: '🔗',
    title: 'Importar recetas de Instagram, TikTok o YouTube',
    subtitle: 'Cómo funciona y qué revisar siempre',
    intro:
      'Pega el enlace del vídeo o post y Nutrilp analiza el contenido para rellenarte nombre, ingredientes y pasos. Antes de guardarla, revisa esto:',
    bullets: [
      {
        lead: 'Cantidades ambiguas.',
        text: 'Si dicen “verdura al gusto” o “un chorrito”, la IA tiene que adivinar una cantidad. Ajusta a lo que tú vayas a poner de verdad.',
      },
      {
        lead: 'Ingredientes que varían mucho.',
        text: 'Una “salsa casera” puede tener macros muy distintos según quién la haga. Si te importa la precisión, sustitúyela por algo del catálogo que se le parezca.',
      },
      {
        lead: 'Marcas y productos concretos.',
        text: 'Si usan un producto de marca, compruébalo con el código de barras — suele ser más exacto que la estimación de la IA.',
      },
    ],
    outro: 'La importación te ahorra el tecleo, pero la revisión final la haces tú. Es tu receta, no la del vídeo.',
  },
  {
    id: 'macros',
    icon: '⚖️',
    title: 'Trucos para que tus macros salgan más precisos',
    subtitle: 'Pequeños detalles que marcan la diferencia',
    bullets: [
      {
        lead: 'Aceite en spray:',
        text: 'aunque el bote marque ~900 kcal/100 g, un par de pulsaciones apenas llegan a 1 g. Pésalo una vez para saber cuánto sale por pulsación.',
      },
      {
        lead: 'Bebidas y salsas “cero”:',
        text: 'perfectas para marinar o dar sabor con calorías prácticamente nulas. El catálogo ya distingue la versión cero de la normal.',
      },
      {
        lead: 'Crudo vs. cocinado:',
        text: 'el arroz, la pasta o las legumbres cambian mucho de peso al cocerse. Usa el ingrediente que corresponda al momento en que pesas.',
      },
      {
        lead: 'Pesa cuando puedas.',
        text: 'Una báscula barata da mucha más precisión que calcular a ojo, sobre todo en aceites, frutos secos o quesos.',
      },
    ],
  },
  {
    id: 'app',
    icon: '✨',
    title: 'Sácale partido a la app',
    subtitle: 'Funciones que a veces pasan desapercibidas',
    bullets: [
      {
        lead: 'Las recetas Nutrilp son generales.',
        text: 'Cópialas a “Mis recetas” y ajusta las cantidades a tu ración real — son un punto de partida, no una receta cerrada.',
      },
      {
        lead: 'La lista de la compra no se rellena sola:',
        text: 'pulsa “Generar desde el plan” cada vez que cambies el menú de la semana.',
      },
      {
        lead: 'Edita el plan a tu gusto:',
        text: 'el tipo de cada comida (desayuno, cena…) es la pista que usa la IA para autocompletar bien; cuanto más preciso, mejor acierta.',
      },
      {
        lead: 'Guarda las semanas redondas.',
        text: 'Si un menú te quedó perfecto, guárdalo en el Historial y recupéralo el mes que viene en dos toques.',
      },
      {
        lead: 'El asistente hace más de lo que parece:',
        text: 'pídele que te rellene huecos concretos del plan, que vacíe un día o que te autocomplete la semana entera.',
      },
      {
        lead: 'Descarga el cuadrante.',
        text: 'Desde la vista Semana puedes generar un PDF apaisado para imprimirlo y pegarlo en la nevera.',
      },
    ],
  },
  {
    id: 'relacion',
    icon: '💛',
    title: 'Buena relación con la comida',
    subtitle: 'Lo más importante de todo este librito',
    intro:
      'Nutrilp te da un plan, pero un plan es una guía, no un contrato que firmas. La vida real no siempre encaja en un cuadrante, y no pasa nada.',
    bullets: [
      {
        lead: 'Saltarte una comida no arruina nada.',
        text: 'Ni el día, ni la semana, ni tu progreso. Sigue con la siguiente y ya está.',
      },
      {
        lead: 'Las comidas libres son parte del plan, no un fallo.',
        text: 'Si las configuraste en tu entrevista, el plan ya cuenta con ellas — disfrútalas sin remordimientos.',
      },
      {
        lead: 'Ningún alimento es “trampa”.',
        text: 'Comer no es un examen que apruebas o suspendes. Por eso aquí nunca usamos esa palabra: lo llamamos “comida libre” a propósito.',
      },
      {
        lead: 'No hace falta “compensar”.',
        text: 'Si un día te sales del plan más de lo previsto, al siguiente vuelves a tu ritmo normal, sin castigos.',
      },
    ],
  },
];

export default function LibritoScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [open, setOpen] = useState<Record<string, boolean>>({ redes: true });

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={{ color: c.inkSoft, fontSize: 15 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: c.terra, fontFamily: Fonts.sans, letterSpacing: 0.6 }}>
            📖 EL LIBRITO
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
            Trucos y consejos
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {CHAPTERS.map((ch) => {
          const isOpen = !!open[ch.id];
          return (
            <View key={ch.id} style={[styles.card, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Pressable
                onPress={() => setOpen((prev) => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                style={styles.chapterHead}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={ch.title}
              >
                <View style={[styles.chapterIcon, { backgroundColor: c.terraSoft }]}>
                  <Text style={{ fontSize: 15 }}>{ch.icon}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans, lineHeight: 18 }}>
                    {ch.title}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{ch.subtitle}</Text>
                </View>
                <Text style={{ color: c.inkSoft, fontSize: 13 }}>{isOpen ? '⌃' : '⌄'}</Text>
              </Pressable>

              {isOpen ? (
                <View style={styles.chapterBody}>
                  {ch.intro ? (
                    <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 20 }}>
                      {ch.intro}
                    </Text>
                  ) : null}
                  {ch.bullets.map((b) => (
                    <View key={b.lead} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ color: c.terra, fontSize: 13, lineHeight: 20 }}>•</Text>
                      <Text style={{ flex: 1, fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 20 }}>
                        <Text style={{ color: c.ink, fontWeight: '700' }}>{b.lead} </Text>
                        {b.text}
                      </Text>
                    </View>
                  ))}
                  {ch.outro ? (
                    <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 20 }}>
                      {ch.outro}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  backBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, gap: 10 },
  card: { borderWidth: 1.5, borderRadius: Radii.panel, paddingHorizontal: 12, paddingVertical: 10 },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chapterIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  chapterBody: { gap: 8, paddingTop: 10 },
});
