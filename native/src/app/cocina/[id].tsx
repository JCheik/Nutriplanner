import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot, type ChefiePose } from '@/components/chefie-mascot';
import { Fonts, Radii } from '@/constants/theme';
import { useRecipes } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { parseStepDurations, splitInstructionSteps } from '@/lib/recipe-steps';
import { pluralizeUnit } from '@/lib/utils';

/**
 * Se rotan por paso para que Chefie no se quede congelado en la misma postura.
 * Todas valen en cualquier paso: son gestos de cocinar o de cara, sin objetos
 * que aten la pose a un contenido concreto (por eso no entran `interview`,
 * `inventory` ni `cooking`).
 */
const STEP_POSES: ChefiePose[] = ['point', 'whisk', 'rolling', 'explain', 'thinking'];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Modo cocina (boceto 7): raciones a preparar que escalan las cantidades,
 * ingredientes con check, un paso a la vez con temporizadores detectados en el
 * texto, y lectura en voz alta. La pantalla no se apaga mientras cocinas.
 */
export default function CocinaScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userRecipes, globalRecipes } = useRecipes();
  useKeepAwake(); // cocinando con las manos ocupadas: que no se apague

  const recipe = useMemo(
    () => [...userRecipes, ...globalRecipes].find((r) => r.id === id),
    [userRecipes, globalRecipes, id]
  );

  const batchServings = recipe?.servings && recipe.servings > 0 ? recipe.servings : 1;
  const [servings, setServings] = useState(batchServings);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  /** Antes de empezar se ven los ingredientes; al arrancar, se pliegan. */
  const [started, setStarted] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Arranca en lo que rinde la receta (coherente con los pasos), una vez
  // cargada desde Firestore.
  useEffect(() => {
    setServings(batchServings);
  }, [batchServings]);

  useEffect(() => {
    if (timerSeconds === null) return;
    if (timerSeconds <= 0) {
      Speech.speak('Tiempo', { language: 'es-ES' });
      setTimerSeconds(null);
      return;
    }
    intervalRef.current = setInterval(() => setTimerSeconds((s) => (s === null ? null : s - 1)), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerSeconds]);

  useEffect(() => () => { Speech.stop(); }, []);

  const steps = useMemo(() => splitInstructionSteps(recipe?.instructions ?? ''), [recipe]);
  const durations = useMemo(() => parseStepDurations(steps[stepIndex] ?? ''), [steps, stepIndex]);
  const scale = servings / batchServings;

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>No se encontró la receta.</Text>
      </View>
    );
  }

  const currentStep = steps[stepIndex] ?? '';
  const stepPose = STEP_POSES[stepIndex % STEP_POSES.length];

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Salir del modo cocina"
        >
          <Text style={{ color: c.inkSoft, fontSize: 15 }}>✕</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }} numberOfLines={1}>
          {recipe.name}
        </Text>
        <Pressable
          onPress={() => Speech.speak(currentStep, { language: 'es-ES' })}
          style={[styles.iconBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Leer el paso en voz alta"
        >
          <Text style={{ fontSize: 14 }}>🔊</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.card, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>RACIONES A PREPARAR</Text>
              <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                la receta rinde {batchServings}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={() => setServings((s) => Math.max(1, s - 1))}
                style={[styles.roundBtn, { borderColor: c.terra }]}
                accessibilityRole="button"
                accessibilityLabel="Una ración menos"
              >
                <Text style={{ color: c.terra, fontSize: 17, lineHeight: 19 }}>−</Text>
              </Pressable>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif, minWidth: 20, textAlign: 'center' }}>
                {servings}
              </Text>
              <Pressable
                onPress={() => setServings((s) => s + 1)}
                style={[styles.roundBtn, { borderColor: c.terra }]}
                accessibilityRole="button"
                accessibilityLabel="Una ración más"
              >
                <Text style={{ color: c.terra, fontSize: 17, lineHeight: 19 }}>＋</Text>
              </Pressable>
            </View>
          </View>
        </View>
        {servings !== batchServings ? (
          <Text style={{ fontSize: 11.5, color: c.sage, fontFamily: Fonts.sans }}>
            Cantidades ajustadas a {servings} {servings === 1 ? 'ración' : 'raciones'} · los pasos describen la receta completa
          </Text>
        ) : null}

        {/* Plegable. Antes la lista estaba siempre desplegada y con una receta
            larga los pasos quedaban tan abajo que había que buscarlos, cuando
            son lo único que miras mientras cocinas. */}
        <Pressable
          onPress={() => setIngredientsOpen((o) => !o)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}
          accessibilityRole="button"
          accessibilityState={{ expanded: ingredientsOpen }}
          accessibilityLabel={ingredientsOpen ? 'Ocultar los ingredientes' : 'Ver los ingredientes'}
        >
          <Text style={[styles.label, { flex: 1, color: c.inkSoft, fontFamily: Fonts.sans }]}>
            INGREDIENTES · PARA {servings}
            {!ingredientsOpen && checkedCount > 0 ? ` · ${checkedCount} listos` : ''}
          </Text>
          <Ionicons name={ingredientsOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.inkSoft} />
        </Pressable>
        {ingredientsOpen && recipe.ingredients.map((ing) => {
          const isWeight = ['g', 'ml', ''].includes((ing.unit || '').toLowerCase());
          const qty = ing.quantity * scale;
          const qtyLabel = isWeight
            ? `${Math.round(qty)} ${ing.unit || 'g'}`
            : `${Number(qty.toFixed(1))} ${pluralizeUnit(ing.unit, qty)}`;
          const isOn = !!checked[ing.id];
          return (
            <Pressable
              key={ing.id}
              onPress={() => setChecked((prev) => ({ ...prev, [ing.id]: !prev[ing.id] }))}
              style={[styles.ingredientRow, { borderColor: c.line, backgroundColor: c.surface }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={ing.name}
            >
              <View style={[styles.check, { borderColor: c.line }, isOn && { backgroundColor: c.terra, borderColor: c.terra }]}>
                {isOn ? <Text style={{ color: '#FFF', fontSize: 10, lineHeight: 12 }}>✓</Text> : null}
              </View>
              <Text
                style={[
                  { flex: 1, fontSize: 13, color: c.ink, fontFamily: Fonts.sans },
                  isOn && { textDecorationLine: 'line-through', color: c.inkSoft },
                ]}
                numberOfLines={2}
              >
                {ing.name}
              </Text>
              <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>{qtyLabel}</Text>
            </Pressable>
          );
        })}

        {/* Antes de empezar: Chefie con los cachivaches, invitando a repasar la
            lista. Es la pantalla que pidió el usuario como primera. */}
        {!started ? (
          <View style={styles.intro}>
            <ChefieMascot pose="utensils" size={92} />
            <Text style={{ flex: 1, fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 19 }}>
              Repasa que tengas todo y ve marcándolo. Cuando quieras, empezamos con los pasos.
            </Text>
          </View>
        ) : null}

        {started && steps.length > 0 ? (
          <>
            <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans, marginTop: 6 }]}>
              PASO {stepIndex + 1} DE {steps.length}
            </Text>
            <View style={[styles.card, styles.stepCard, { borderColor: c.line, backgroundColor: c.surface }]}>
              {/* Chefie acompaña cada paso, no solo el final. `point` se voltea
                  porque el brazo señala a la izquierda y aquí Chefie está a la
                  izquierda del texto: sin voltear señalaría hacia fuera. Las
                  demás poses no tienen dirección, así que se dejan como son. */}
              <ChefieMascot pose={stepPose} size={52} flip={stepPose === 'point'} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, color: c.ink, fontFamily: Fonts.sans, lineHeight: 23 }}>{currentStep}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {durations.map((d) => (
                    <Pressable
                      key={d.label}
                      onPress={() => setTimerSeconds(d.seconds)}
                      style={[styles.timerBtn, { borderColor: c.terra }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Temporizador de ${d.label}`}
                    >
                      <Text style={{ color: c.terra, fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans }}>
                        ⏱ {d.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </>
        ) : null}

        {/* Al llegar al último paso no pasaba nada: el botón «Siguiente» se
            apagaba y ya. Terminar de cocinar merece un cierre. */}
        {started && steps.length > 0 && stepIndex === steps.length - 1 ? (
          <View style={[styles.card, styles.doneCard, { borderColor: c.sage, backgroundColor: c.sageSoft }]}>
            <ChefieMascot pose="cooking" size={96} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
                ¡Y con esto ya está!
              </Text>
              <Text style={{ fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 18 }}>
                Que aproveche. Si te ha quedado buena, acuérdate de guardar la semana en tu historial.
              </Text>
            </View>
          </View>
        ) : null}

        {timerSeconds !== null ? (
          <View style={[styles.card, styles.timerCard, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink, fontFamily: Fonts.serif }}>
              {formatClock(timerSeconds)}
            </Text>
            <Pressable onPress={() => setTimerSeconds(null)} accessibilityRole="button" accessibilityLabel="Parar temporizador">
              <Text style={{ color: c.inkSoft, fontSize: 12.5, fontFamily: Fonts.sans }}>Parar</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {steps.length > 0 ? (
        <View style={[styles.navRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {!started ? (
            // Un solo botón antes de arrancar: al pulsarlo se pliegan los
            // ingredientes y aparece el paso 1, que es lo que se pidió.
            <Pressable
              onPress={() => {
                setStarted(true);
                setIngredientsOpen(false);
              }}
              style={[styles.navBtn, { flex: 1, backgroundColor: c.terra }]}
              accessibilityRole="button"
              accessibilityLabel="Empezar con los pasos"
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
                Empezar a cocinar →
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  // Desde el paso 1 hacia atrás se vuelve a los ingredientes.
                  if (stepIndex === 0) {
                    setStarted(false);
                    setIngredientsOpen(true);
                  } else setStepIndex((i) => i - 1);
                }}
                style={[styles.navBtn, { borderWidth: 1.5, borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel={stepIndex === 0 ? 'Volver a los ingredientes' : 'Paso anterior'}
              >
                <Text style={{ color: c.inkSoft, fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
                  ← {stepIndex === 0 ? 'Ingredientes' : 'Anterior'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                disabled={stepIndex >= steps.length - 1}
                style={[styles.navBtn, { backgroundColor: c.terra }, stepIndex >= steps.length - 1 && { opacity: 0.4 }]}
                accessibilityRole="button"
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>Siguiente →</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 10 },
  iconBtn: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 20, gap: 8 },
  card: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 11 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  roundBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  check: { width: 17, height: 17, borderWidth: 1.5, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  timerBtn: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  timerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  navRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 6 },
  navBtn: { flex: 1, borderRadius: Radii.card, paddingVertical: 13, alignItems: 'center' },
});
