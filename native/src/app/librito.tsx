import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot, type ChefiePose } from '@/components/chefie-mascot';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * "El Librito": guía de referencia, siempre disponible. Mismo contenido que la
 * web (`dashboard/librito`) — si se edita allí, actualizar aquí también.
 *
 * En la app NO se lee como en la web: allí es un acordeón y cada capítulo suelta
 * seis párrafos de golpe, que en móvil es un muro de texto. Aquí la lista es
 * solo el índice, y al entrar en una lección Chefie la cuenta de idea en idea,
 * avanzando con "Siguiente".
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
    title: 'Importar recetas de una web, Instagram, TikTok o YouTube',
    subtitle: 'Cómo funciona y qué revisar siempre',
    intro:
      'Pega el enlace y saco nombre, ingredientes y pasos. Si es una web de recetas suele traerla ya estructurada y sale clavada; si es un vídeo, me lo miro entero. Antes de guardarla, revisa esto:',
    bullets: [
      {
        lead: 'Las raciones, lo primero.',
        text: 'Si la receta era para ocho y se guarda como una, todos los macros salen ocho veces más altos. En la pantalla de revisión puedes corregirlo, o pasarla a una sola ración.',
      },
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
        text: 'Si usan un producto de marca, búscalo en “Producto del súper”: esos datos salen de la etiqueta y son más fiables que la estimación de la IA.',
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
        lead: 'Bebidas “cero”:',
        text: 'los refrescos zero rondan 0-1 kcal por 100 ml. Ahí sí puedes olvidarte de la cuenta y usarlos para dar sabor.',
      },
      {
        lead: 'Salsas “cero” o “light”: ojo, no son cero.',
        text: 'Bajan mucho respecto a la normal, pero siguen sumando: un kétchup sin azúcar ronda las 25 kcal/100 g, una barbacoa cero puede pasar de 50 y una mayonesa light sigue por encima de 250. Míralo en la etiqueta y cuéntalas.',
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
        text: 'Son un punto de partida, no una receta cerrada. Al meterlas en el plan ajusta las raciones con − y + hasta que cuadre con lo que tú comes. (Para clonarla y reescribirla a tu gusto, de momento hay que entrar desde la web.)',
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
        text: 'pídele que te rellene huecos concretos del plan, que vacíe un día o que te autocomplete la semana entera. Lo largo lo hace en segundo plano: sigue usando la app y te aviso desde la esquina cuando esté.',
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
        text: 'El día que comas fuera, borra del cuadrante la comida que te saltes: al final estás cambiando una comida por otra, no sumando una de más. Disfrútala sin remordimientos.',
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

/** Una pantalla de la lección: un solo párrafo, con su pose de Chefie. */
interface LessonStep {
  lead?: string;
  text: string;
  pose: ChefiePose;
}

/** Los `lead` vienen con "." o ":" al final porque en la web van en línea con
 *  el texto. Aquí son titulares, y el signo suelto queda raro. */
function cleanLead(lead: string): string {
  return lead.replace(/[.:]\s*$/, '');
}

/**
 * Los textos que en la web seguían a un lead acabado en ":" empiezan en
 * minúscula ("Aceite en spray: aunque el bote…"). Separados en titular y
 * párrafo, esa minúscula parece una errata.
 */
function capitalizeFirst(text: string): string {
  const i = text.search(/[a-záéíóúñ]/);
  if (i !== 0) return text;
  return text[0].toUpperCase() + text.slice(1);
}

// Se van rotando para que no salga siempre la misma postura.
const BULLET_POSES: ChefiePose[] = ['point', 'explain', 'whisk', 'thumbsup'];

/** Trocea un capítulo en pasos: intro, cada consejo por separado, y el cierre. */
function buildSteps(ch: Chapter): LessonStep[] {
  const steps: LessonStep[] = [];
  if (ch.intro) steps.push({ text: ch.intro, pose: 'explain' });
  ch.bullets.forEach((b, i) =>
    steps.push({
      lead: cleanLead(b.lead),
      text: capitalizeFirst(b.text),
      pose: BULLET_POSES[i % BULLET_POSES.length],
    })
  );
  if (ch.outro) steps.push({ text: ch.outro, pose: 'celebrate' });
  return steps;
}

export default function LibritoScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [lesson, setLesson] = useState<Chapter | null>(null);
  const [step, setStep] = useState(0);

  const steps = useMemo(() => (lesson ? buildSteps(lesson) : []), [lesson]);

  const openLesson = (ch: Chapter) => {
    setLesson(ch);
    setStep(0);
  };
  const closeLesson = () => setLesson(null);

  if (lesson) {
    const current = steps[step];
    const isLast = step === steps.length - 1;
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
        <View style={styles.header}>
          <Pressable
            onPress={closeLesson}
            style={[styles.backBtn, { borderColor: c.line }]}
            accessibilityRole="button"
            accessibilityLabel="Volver al índice del Librito"
          >
            <Text style={{ color: c.inkSoft, fontSize: 15 }}>←</Text>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: c.terra, fontFamily: Fonts.sans, letterSpacing: 0.6 }}>
              {lesson.icon} LECCIÓN
            </Text>
            <Text
              numberOfLines={2}
              style={{ fontSize: 16, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif, lineHeight: 21 }}
            >
              {lesson.title}
            </Text>
          </View>
        </View>

        {/* Barra de avance: da idea de cuánto queda, que era parte de lo que
            agobiaba del muro de texto — no se veía el final. */}
        <View style={[styles.progressTrack, { backgroundColor: c.line }]}>
          <View
            style={[styles.progressFill, { backgroundColor: c.terra, width: `${((step + 1) / steps.length) * 100}%` }]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.lessonBody}>
          <ChefieMascot pose={current.pose} size={128} />
          <View style={[styles.bubble, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}>
            {current.lead ? (
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif, lineHeight: 22 }}>
                {current.lead}
              </Text>
            ) : null}
            <Text style={{ fontSize: 14.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 22 }}>
              {current.text}
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.lessonFooter, { paddingBottom: insets.bottom + 14, borderTopColor: c.line }]}>
          <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
            {step + 1} de {steps.length}
          </Text>
          <View style={{ flex: 1 }} />
          {step > 0 ? (
            <Pressable
              onPress={() => setStep((s) => s - 1)}
              style={[styles.navBtn, { borderWidth: 1.5, borderColor: c.line }]}
              accessibilityRole="button"
              accessibilityLabel="Atrás"
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.inkSoft, fontFamily: Fonts.sans }}>Atrás</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => (isLast ? closeLesson() : setStep((s) => s + 1))}
            style={[styles.navBtn, Shadows.card, { backgroundColor: c.terra, flexDirection: 'row', gap: 6 }]}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Terminar la lección' : 'Siguiente'}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF', fontFamily: Fonts.sans }}>
              {isLast ? 'Terminar' : 'Siguiente'}
            </Text>
            <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={14} color="#FFF" />
          </Pressable>
        </View>
      </View>
    );
  }


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
        <Text style={{ fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 18, marginBottom: 2 }}>
          Cuatro lecciones cortas. Entra en la que quieras y te la cuento poco a poco.
        </Text>
        {CHAPTERS.map((ch) => {
          const count = buildSteps(ch).length;
          return (
            <Pressable
              key={ch.id}
              onPress={() => openLesson(ch)}
              style={[styles.card, styles.chapterHead, { borderColor: c.line, backgroundColor: c.surface }]}
              accessibilityRole="button"
              accessibilityLabel={`${ch.title}. ${count} pasos`}
            >
              <View style={[styles.chapterIcon, { backgroundColor: c.terraSoft }]}>
                <Text style={{ fontSize: 15 }}>{ch.icon}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans, lineHeight: 18 }}>
                  {ch.title}
                </Text>
                <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                  {ch.subtitle} · {count} pasos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.inkSoft} />
            </Pressable>
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
  card: { borderWidth: 1.5, borderRadius: Radii.panel, paddingHorizontal: 12, paddingVertical: 12 },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chapterIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  progressTrack: { height: 3, marginHorizontal: 18, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  lessonBody: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 18, gap: 14 },
  bubble: { alignSelf: 'stretch', borderWidth: 1.5, borderRadius: Radii.panel, paddingHorizontal: 16, paddingVertical: 16, gap: 7 },
  lessonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { borderRadius: Radii.card, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
});
