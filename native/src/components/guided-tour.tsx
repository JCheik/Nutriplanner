import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot, type ChefiePose } from '@/components/chefie-mascot';
import { Fonts, Radii } from '@/constants/theme';
import { useOnboardingFlag } from '@/hooks/use-onboarding-flag';
import { useTheme } from '@/hooks/use-theme';

interface Step {
  title: string;
  text: string;
  pose: ChefiePose;
  /** Pestaña a la que se lleva al usuario en este paso. */
  route?: '/' | '/recetas' | '/ia' | '/compra' | '/perfil';
  /** Índice en la barra (0-4) para apuntar la flecha a esa pestaña. */
  tabIndex?: number;
}

const TAB_COUNT = 5;

/**
 * Pasos del tour. El primero y el último van centrados (sin pestaña); el resto
 * NAVEGA de verdad a cada pestaña, que es lo que pidió el usuario: que el
 * tutorial te lleve por la app en vez de ser una sola pantalla.
 */
const STEPS: Step[] = [
  {
    title: '¡Hola! Soy Chefie',
    text: 'Te enseño Nutrilp en medio minuto. Esto va de organizar tu semana de comidas para comer bien y no tirar comida — no de contar cada bocado.',
    pose: 'explain',
  },
  {
    title: 'Tu día, de un vistazo',
    text: 'Aquí ves lo que toca hoy y cuánto llevas frente a tu objetivo. Añade comidas en cada franja y ajusta las raciones con − y +.',
    pose: 'point',
    route: '/',
    tabIndex: 0,
  },
  {
    title: 'Y la semana entera',
    text: 'Con el botón "Semana" pasas al cuadrante: toca cualquier casilla para planificarla. Desde ahí puedes descargarlo en PDF e imprimirlo para la nevera.',
    pose: 'explain',
    route: '/',
    tabIndex: 0,
  },
  {
    title: 'Tus recetas',
    text: 'Las tuyas y el recetario de Nutrilp. Busca por nombre o por ingrediente, filtra por tipo de comida o dieta, y entra en cualquiera para ver el modo cocina.',
    pose: 'point',
    route: '/recetas',
    tabIndex: 1,
  },
  {
    title: 'El asistente',
    text: 'Pídeme lo que quieras: "añade pollo al curry el martes", "vacía el lunes" o "autocompleta la semana". También puedo mirar una foto de tu nevera y proponerte recetas con lo que ya tienes.',
    pose: 'celebrate',
    route: '/ia',
    tabIndex: 2,
  },
  {
    title: 'La compra',
    text: 'Se genera de tu plan y ajustada a tus raciones, así compras lo justo. Recuerda que no se actualiza sola: cada vez que cambies el plan, dale tú a "Generar desde el plan".',
    pose: 'point',
    route: '/compra',
    tabIndex: 3,
  },
  {
    title: 'Tu perfil',
    text: 'Aquí están tu objetivo diario y la entrevista: cuéntame tus gustos y tus alergias para que pueda montarte una dieta a tu gusto. También guardas semanas que te funcionaron y tienes El Librito con los tutoriales.',
    pose: 'explain',
    route: '/perfil',
    tabIndex: 4,
  },
  {
    title: '¡Listo!',
    text: 'Ya está. Si te pierdes, puedes volver a ver esto desde "Ver guías de nuevo" en la web. ¡A planificar!',
    pose: 'celebrate',
  },
];

/**
 * Tour guiado de bienvenida: recorre las pestañas de verdad, con Chefie
 * explicando cada una y una flecha señalando la pestaña de la barra inferior.
 * Se muestra una sola vez; el flag vive en el perfil (compartido con la web).
 */
export function GuidedTour() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { shouldShow, dismissForever } = useOnboardingFlag('native-tour');
  const [index, setIndex] = useState(0);

  const step = STEPS[index];

  // Llevar al usuario a la pestaña del paso actual.
  useEffect(() => {
    if (!shouldShow || !step.route) return;
    router.navigate(step.route);
  }, [shouldShow, step.route, router]);

  if (!shouldShow) return null;

  const isLast = index === STEPS.length - 1;
  const anchored = step.tabIndex !== undefined;
  // Flecha centrada bajo la pestaña correspondiente de la barra de 5.
  const arrowLeft = anchored ? ((step.tabIndex! + 0.5) * width) / TAB_COUNT - 9 : 0;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismissForever}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.cardWrap,
            anchored
              ? { position: 'absolute', left: 14, right: 14, bottom: insets.bottom + 74 }
              : { paddingHorizontal: 22 },
          ]}
        >
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.terra }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <ChefieMascot pose={step.pose} size={anchored ? 58 : 84} />
              <View style={{ flex: 1, gap: 4, paddingTop: 4 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
                  {step.title}
                </Text>
                <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 19 }}>
                  {step.text}
                </Text>
              </View>
            </View>

            <View style={styles.controls}>
              <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
                {index + 1} de {STEPS.length}
              </Text>
              <Pressable onPress={dismissForever} hitSlop={8} accessibilityRole="button">
                <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>Saltar</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              {index > 0 ? (
                <Pressable
                  onPress={() => setIndex((i) => Math.max(0, i - 1))}
                  style={[styles.btn, { borderWidth: 1.5, borderColor: c.line }]}
                  accessibilityRole="button"
                  accessibilityLabel="Atrás"
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.inkSoft, fontFamily: Fonts.sans }}>
                    Atrás
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => (isLast ? dismissForever() : setIndex((i) => i + 1))}
                style={[styles.btn, { backgroundColor: c.terra, flexDirection: 'row', gap: 5 }]}
                accessibilityRole="button"
                accessibilityLabel={isLast ? 'Empezar' : 'Siguiente'}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFF', fontFamily: Fonts.sans }}>
                  {isLast ? 'Empezar' : 'Siguiente'}
                </Text>
                <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={14} color="#FFF" />
              </Pressable>
            </View>
          </View>

          {anchored ? (
            <View style={[styles.arrow, { left: arrowLeft, borderTopColor: c.terra }]} pointerEvents="none" />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(58,36,20,0.55)', justifyContent: 'center' },
  cardWrap: {},
  card: {
    borderWidth: 2,
    borderRadius: Radii.panel,
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 12,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { borderRadius: Radii.card, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  // Triangulito que apunta a la pestaña de abajo.
  arrow: {
    position: 'absolute',
    bottom: -11,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
