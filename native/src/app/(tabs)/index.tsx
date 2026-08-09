import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { collection } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaperTexture } from '@/components/paper-texture';
import { ScreenTitle } from '@/components/screen-scaffold';
import { Fonts, Radii, Shadows, type ThemeColors } from '@/constants/theme';
import { firestore } from '@/firebase';
import { useAuthUser } from '@/firebase/auth-context';
import { useCollection } from '@/firebase/firestore-hooks';
import {
  clearDay,
  clearMeal,
  clearWeek,
  deleteWeekSnapshot,
  pasteDayInto,
  pasteRecipesIntoMeal,
  removeRecipeFromMeal,
  restoreWeek,
  saveWeekSnapshot,
} from '@/firebase/plan-operations';
import { useProfile, useWeekPlan } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { setPlanClipboard, usePlanClipboard } from '@/lib/plan-clipboard';
import { describeEmptySlots, findEmptySlots } from '@/lib/plan-search';
import { formatServings } from '@/lib/serving-utils';
import { shareWeekPdf } from '@/lib/week-pdf';
import type { DayPlan, GoalMacros, Macros, RecipeInstance, WeekHistoryEntry } from '@/lib/types';

/** Macros a RecipeInstance contributes to the day: batch totals × raciones/lote. */
function instanceMacros(r: RecipeInstance) {
  const scale = (r.servingsEaten ?? 1) / (r.servings && r.servings > 0 ? r.servings : 1);
  return {
    calories: (r.calories || 0) * scale,
    protein: (r.protein || 0) * scale,
    carbs: (r.carbs || 0) * scale,
    fat: (r.fat || 0) * scale,
  };
}

function dayTotals(day: DayPlan): Macros {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  day.meals.forEach((m) =>
    m.recipes.forEach((r) => {
      const mac = instanceMacros(r);
      total.calories += mac.calories;
      total.protein += mac.protein;
      total.carbs += mac.carbs;
      total.fat += mac.fat;
    })
  );
  return total;
}

/** Monday-first index for today (JS getDay: 0=Sunday). */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

/**
 * Color por cercanía al objetivo, con los MISMOS umbrales que la web
 * (`macroHexColor` en mobile-page-content): en rango 0.9–1.1, cerca hasta
 * 0.75/1.25, lejos el resto. Traducido a la paleta de la app.
 */
function fitColor(c: ThemeColors, value: number, goal?: number): string {
  if (!goal || goal <= 0) return c.inkSoft;
  const ratio = value / goal;
  if (ratio >= 0.9 && ratio <= 1.1) return c.sage;
  if ((ratio >= 0.75 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.25)) return c.macroCarbs;
  return c.terra;
}

/**
 * Color del TOTAL de la semana. Mientras falten días por planificar, en neutro:
 * comparar media semana con el objetivo de siete días no significa nada, y
 * pintarlo en terracota hacía que una semana a medias se leyese como una alarma
 * cuando lo único que pasa es que queda plan por hacer.
 */
function weekFitColor(c: ThemeColors, value: number, weekGoal: number, daysWithPlan: number): string {
  return daysWithPlan < 7 ? c.inkSoft : fitColor(c, value, weekGoal);
}

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// Cuadrante: comidas en FILAS (columna fija) y días en COLUMNAS, como la web.
const DAY_COL_W = 78;
// 70 para que "DESAYUNO"/"ALMUERZO" quepan en una línea a 9.5px.
const MEAL_COL_W = 70;
const HEAD_H = 34;
const ROW_H = 74;
const TOTAL_H = 62;
/** Alto de la fila "vaciar" que aparece bajo cada día en modo edición. */
const CLEAR_ROW_H = 27;

/** Barra de progreso: relleno = valor, el ancho total = objetivo. */
function Bar({ value, goal, color, height = 7 }: { value: number; goal?: number; color: string; height?: number }) {
  const c = useTheme();
  const pct = goal && goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <View style={{ height, borderRadius: 99, backgroundColor: c.chip, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${pct}%`, borderRadius: 99, backgroundColor: color }} />
    </View>
  );
}

/** Barra de un macro PLANIFICADO frente al objetivo del día. */
function MacroBar({
  label,
  value,
  goal,
  unit,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>{label}</Text>
        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
          {Math.round(value)} / {Math.round(goal)}
          {unit}
        </Text>
      </View>
      <Bar value={value} goal={goal} color={color} />
    </View>
  );
}

/**
 * Tarjeta única del día, TODO sobre lo PLANIFICADO: anillo con las kcal que
 * quedan por planificar para llegar al objetivo + una barra por macro (lo
 * puesto en el plan frente al objetivo).
 *
 * Aquí NO hay nada de "lo que llevas comido": Nutrilp organiza la semana, no
 * lleva el conteo diario (ver PLAN-app-nativa.md §norte). Los números salen del
 * plan del día: totales del LOTE de cada receta escalados a las raciones
 * planificadas en ese hueco (`instanceMacros`).
 */
function GoalHero({ planned, goal }: { planned: Macros; goal: GoalMacros | null }) {
  const c = useTheme();

  if (!goal) {
    return (
      <View style={[styles.card, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}>
        <Text style={{ fontSize: 13, color: c.ink, fontFamily: Fonts.sans, lineHeight: 19 }}>
          Planificado: {Math.round(planned.calories)} kcal · {Math.round(planned.protein)} P ·{' '}
          {Math.round(planned.carbs)} C · {Math.round(planned.fat)} G.
        </Text>
        <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 18 }}>
          Configura tu objetivo diario en Perfil para ver si encaja.
        </Text>
      </View>
    );
  }

  const remaining = Math.round(goal.calories - planned.calories);

  return (
    <View style={[styles.card, styles.heroTop, Shadows.raised, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
      {/* Dentro del anillo solo el número y "kcal": la frase larga no cabía en
          92 px y se partía fea. El matiz va debajo, ya fuera del círculo. */}
      <View style={{ alignItems: 'center', gap: 4, width: 96 }}>
        <View style={[styles.ring, { borderColor: c.terra, backgroundColor: c.surface }]}>
          <Text style={{ fontSize: 24, color: c.ink, fontFamily: Fonts.serif }}>{Math.abs(remaining)}</Text>
          <Text style={{ fontSize: 10, color: c.inkSoft, fontFamily: Fonts.sans, marginTop: -1 }}>kcal</Text>
        </View>
        <Text
          style={{ fontSize: 9.5, fontWeight: '700', letterSpacing: 0.2, color: c.terra, fontFamily: Fonts.sans, textAlign: 'center' }}
        >
          {remaining >= 0 ? 'POR PLANIFICAR' : 'DE MÁS'}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        <MacroBar
          label="Calorías"
          value={planned.calories}
          goal={goal.calories}
          unit=""
          color={fitColor(c, planned.calories, goal.calories)}
        />
        <MacroBar
          label="Proteína"
          value={planned.protein}
          goal={goal.protein}
          unit=" g"
          color={c.macroProtein}
        />
        <MacroBar label="Carbohidr." value={planned.carbs} goal={goal.carbs} unit=" g" color={c.macroCarbs} />
        <MacroBar label="Grasas" value={planned.fat} goal={goal.fat} unit=" g" color={c.macroFat} />
      </View>
    </View>
  );
}

function HoyView({
  weekPlan,
  goal,
  selected,
  onSelect,
}: {
  weekPlan: DayPlan[];
  goal: GoalMacros | null;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const c = useTheme();
  const router = useRouter();
  const { user } = useAuthUser();
  const day = weekPlan[selected];
  const totals = useMemo(() => dayTotals(day), [day]);
  const clipboard = usePlanClipboard();
  // Pegar un día pisa lo que hubiera: se confirma en la propia fila (`Alert` no
  // existe en RN Web y esto además evita un diálogo modal por un gesto menor).
  const [confirmPaste, setConfirmPaste] = useState(false);
  const dayHasPlan = day.meals.some((m) => m.recipes.length > 0);

  const copyDay = () => {
    setPlanClipboard({ kind: 'day', label: DAY_NAMES[selected], meals: day.meals });
    setConfirmPaste(false);
  };
  const pasteDay = () => {
    if (!user || clipboard?.kind !== 'day') return;
    pasteDayInto(user.uid, day.day, clipboard.meals).catch(() => {});
    setConfirmPaste(false);
  };
  const copyMeal = (meal: DayPlan['meals'][number]) => {
    setPlanClipboard({
      kind: 'meal',
      label: meal.title,
      dayLabel: DAY_NAMES[selected],
      recipes: meal.recipes,
    });
  };
  const pasteMeal = (mealId: string) => {
    if (!user || clipboard?.kind !== 'meal') return;
    pasteRecipesIntoMeal(user.uid, day.day, mealId, clipboard.recipes).catch(() => {});
  };

  // Writes are fire-and-forget over the live subscription (like the web); a
  // failure just leaves the list as-is, so no local optimistic state needed.
  //
  // Las raciones ya no se tocan desde aquí: viven en la pantalla del hueco
  // (`/anadir`), que es donde se ve lo que hay puesto. En la tarjeta de Hoy
  // solo estorbaban.
  const removeRecipe = (mealId: string, r: RecipeInstance) => {
    if (!user) return;
    removeRecipeFromMeal(user.uid, day.day, mealId, r.instanceId).catch(() => {});
  };

  return (
    <>
      <View style={styles.dayStrip}>
        {weekPlan.map((d, i) => {
          const active = i === selected;
          const planned = d.meals.some((m) => m.recipes.length > 0);
          return (
            <Pressable
              key={d.day}
              onPress={() => onSelect(i)}
              style={[
                styles.dayPill,
                { borderColor: c.line, backgroundColor: c.surface },
                active && [{ backgroundColor: c.terra, borderColor: c.terra }, Shadows.card],
              ]}
              accessibilityRole="button"
              accessibilityLabel={DAY_NAMES[i]}
            >
              <Text style={{ fontSize: 12, color: active ? '#FFF' : c.inkSoft, fontFamily: Fonts.serif }}>
                {DAY_LETTERS[i]}
              </Text>
              <Text style={{ fontSize: 8, color: active ? '#FFF' : c.terra, opacity: planned ? 1 : 0 }}>•</Text>
            </Pressable>
          );
        })}
      </View>

      <GoalHero planned={totals} goal={goal} />

      {/* Copiar/pegar el día entero: la vía rápida para repetir un día que ya
          te funcionó en otro de la semana. */}
      <View style={styles.copyRow}>
        {confirmPaste && clipboard?.kind === 'day' ? (
          <>
            <Text style={{ flex: 1, fontSize: 11.5, color: c.ink, fontFamily: Fonts.sans }}>
              ¿Sustituir {DAY_NAMES[selected].toLowerCase()} por {clipboard.label.toLowerCase()}?
            </Text>
            <Pressable
              onPress={pasteDay}
              style={[styles.chip, { backgroundColor: c.terra, borderColor: c.terra }]}
              accessibilityRole="button"
              accessibilityLabel="Sí, pegar el día"
            >
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFF', fontFamily: Fonts.sans }}>Sí, pegar</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmPaste(false)}
              style={[styles.chip, { borderColor: c.line }]}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
            >
              <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>No</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={copyDay}
              disabled={!dayHasPlan}
              style={[styles.chip, { borderColor: c.line }, !dayHasPlan && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel={`Copiar el ${DAY_NAMES[selected]}`}
            >
              <Ionicons name="copy-outline" size={13} color={c.inkSoft} />
              <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>Copiar día</Text>
            </Pressable>
            {clipboard?.kind === 'day' ? (
              <Pressable
                onPress={() => setConfirmPaste(true)}
                style={[styles.chip, { borderColor: c.terra, backgroundColor: c.terraSoft }]}
                accessibilityRole="button"
                accessibilityLabel={`Pegar ${clipboard.label} aquí`}
              >
                <Ionicons name="clipboard-outline" size={13} color={c.terra} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.terra, fontFamily: Fonts.sans }}>
                  Pegar {clipboard.label.toLowerCase()} aquí
                </Text>
              </Pressable>
            ) : null}
            {clipboard ? (
              <Pressable onPress={() => setPlanClipboard(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Vaciar portapapeles">
                <Ionicons name="close-circle-outline" size={16} color={c.inkSoft} />
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      {day.meals.map((meal) => (
        <View key={meal.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.sectionLabel, { flex: 1, color: c.inkSoft, fontFamily: Fonts.sans }]}>
              {meal.title.toUpperCase()}
            </Text>
            {meal.recipes.length > 0 ? (
              <>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/anadir',
                      params: { day: day.day, mealId: meal.id, title: meal.title },
                    })
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Añadir otra cosa a ${meal.title}`}
                >
                  <Ionicons name="add" size={16} color={c.inkSoft} />
                </Pressable>
                <Pressable
                  onPress={() => copyMeal(meal)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Copiar ${meal.title}`}
                >
                  <Ionicons name="copy-outline" size={14} color={c.inkSoft} />
                </Pressable>
              </>
            ) : null}
            {clipboard?.kind === 'meal' ? (
              <Pressable
                onPress={() => pasteMeal(meal.id)}
                style={[styles.chip, { borderColor: c.terra, backgroundColor: c.terraSoft, paddingVertical: 3 }]}
                accessibilityRole="button"
                accessibilityLabel={`Pegar ${clipboard.label} de ${clipboard.dayLabel} aquí`}
              >
                <Ionicons name="clipboard-outline" size={12} color={c.terra} />
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: c.terra, fontFamily: Fonts.sans }}>
                  Pegar {clipboard.label.toLowerCase()}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {meal.recipes.map((r) => {
            const mac = instanceMacros(r);
            const batch = r.servings && r.servings > 1 ? r.servings : 0;
            return (
              <View
                key={r.instanceId}
                style={[styles.card, Shadows.card, styles.mealCard, { borderColor: c.line, backgroundColor: c.surface }]}
              >
                {/* Toda la zona de la foto y el texto abre la receta. Los botones
                    van FUERA de ese Pressable, no dentro: anidados, el toque
                    caía en los dos. */}
                <Pressable
                  onPress={() => router.push({ pathname: '/receta/[id]', params: { id: r.id } })}
                  style={styles.mealCardMain}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${r.name}`}
                >
                  {r.imageUrl ? (
                    <Image source={{ uri: r.imageUrl }} style={styles.thumb} contentFit="cover" transition={150} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: c.terraSoft }]}>
                      <Ionicons name="restaurant-outline" size={17} color={c.terra} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text
                      style={{ fontSize: 13.5, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }}
                      numberOfLines={2}
                    >
                      {r.name}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                      {formatServings(r.servingsEaten ?? 1)} rac · {Math.round(mac.calories)} kcal ·{' '}
                      {Math.round(mac.protein)} P
                      {batch ? ` · lote de ${batch}` : ''}
                    </Text>
                  </View>
                </Pressable>

                {/* Atajo directo a cocinar: era lo que más costaba alcanzar, y
                    es lo que de verdad haces con la comida de hoy. */}
                {r.instructions ? (
                  <Pressable
                    onPress={() => router.push({ pathname: '/cocina/[id]', params: { id: r.id } })}
                    hitSlop={6}
                    style={[styles.cookBtn, { borderColor: c.terra, backgroundColor: c.terraSoft }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Cocinar ${r.name}`}
                  >
                    {/* Un "play": el modo cocina es una guía que se arranca y se
                        va pasando. El fuego sugería calor, no arrancar nada. */}
                    <Ionicons name="play" size={15} color={c.terra} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => removeRecipe(meal.id, r)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${r.name}`}
                >
                  <Ionicons name="close" size={16} color={c.inkSoft} />
                </Pressable>
              </View>
            );
          })}
          {/* El "Añadir…" grande solo cuando el hueco está VACÍO: repetido bajo
              cada comida ya puesta era ruido. Con algo dentro, el + discreto de
              la cabecera hace el mismo trabajo. */}
          {meal.recipes.length === 0 ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/anadir',
                  params: { day: day.day, mealId: meal.id, title: meal.title },
                })
              }
              style={[styles.card, styles.emptySlot, { borderColor: c.line }]}
              accessibilityRole="button"
              accessibilityLabel={`Añadir ${meal.title}`}
            >
              <Ionicons name="add" size={14} color={c.inkSoft} />
              <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
                Añadir {meal.title.toLowerCase()}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </>
  );
}

/**
 * Semana: el cuadrante días × comidas, orientado como la web y como el papel
 * de la nevera — **comidas en filas** (columna fija a la izquierda) y **días en
 * columnas** con scroll lateral. Cada celda es pulsable para planificar esa
 * comida, y cada columna cierra con el total del día en barra.
 */
function SemanaView({
  weekPlan,
  goal,
  freeMeals,
  onOpenDay,
}: {
  weekPlan: DayPlan[];
  goal: GoalMacros | null;
  /** Comidas libres/semana de la entrevista, para explicar el margen sobrante. */
  freeMeals?: number;
  onOpenDay: (index: number) => void;
}) {
  const c = useTheme();
  const router = useRouter();
  const { user } = useAuthUser();
  const today = todayIndex();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  // Modo edición: hasta que se activa, tocar una casilla la abre para añadir.
  // Con él, cada casilla con contenido enseña su ✕ y aparece "vaciar" por día.
  const [editing, setEditing] = useState(false);
  const [confirmClearWeek, setConfirmClearWeek] = useState(false);

  /**
   * Historial de semanas. Vivía en Perfil, pero guardar y recuperar una semana
   * es algo que se hace MIRANDO el cuadrante, no entrando en los ajustes.
   */
  const historyRef = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'weekHistory') : null),
    [user]
  );
  const { data: history } = useCollection<WeekHistoryEntry>(historyRef);
  const [histBusy, setHistBusy] = useState(false);
  const [histNotice, setHistNotice] = useState<string | null>(null);
  const sortedHistory = useMemo(
    () => [...(history ?? [])].sort((a, b) => b.savedAt - a.savedAt),
    [history]
  );

  const emptyMeal = (day: string, mealId: string) => {
    if (!user) return;
    clearMeal(user.uid, day, mealId).catch(() => {});
  };
  const emptyDay = (day: string) => {
    if (!user) return;
    clearDay(user.uid, day).catch(() => {});
  };
  const emptyWeek = () => {
    if (!user) return;
    clearWeek(user.uid).catch(() => {});
    setConfirmClearWeek(false);
    setEditing(false);
  };

  const mealTitles = weekPlan[0]?.meals.map((m) => m.title) ?? [];
  const weekHasContent = weekPlan.some((d) => d.meals.some((m) => m.recipes.length > 0));
  const emptySlots = useMemo(() => findEmptySlots(weekPlan), [weekPlan]);
  const perDay = useMemo(() => weekPlan.map(dayTotals), [weekPlan]);
  const weekPlanned = perDay.reduce((sum, d) => sum + d.calories, 0);
  const daysWithPlan = perDay.filter((d) => d.calories > 0).length;
  const weekMargin = goal ? goal.calories * 7 - weekPlanned : 0;

  const runHist = async (fn: () => Promise<unknown>, okMsg: string) => {
    if (histBusy || !user) return;
    setHistBusy(true);
    setHistNotice(null);
    try {
      await fn();
      setHistNotice(okMsg);
    } catch {
      setHistNotice('No se pudo completar. Revisa tu conexión.');
    } finally {
      setHistBusy(false);
    }
  };

  const handleSaveWeek = () =>
    runHist(async () => {
      const label = `Semana del ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
      await saveWeekSnapshot(user!.uid, label, weekPlan);
    }, 'Semana guardada. La tienes abajo, en el historial.');

  const handleDownload = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await shareWeekPdf(weekPlan);
    } catch {
      setPdfError('No se pudo generar el PDF. Inténtalo de nuevo.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <>
      {/* Objetivo + lo que hay agendado, igual que en Hoy pero a escala semana */}
      <View style={[styles.card, Shadows.card, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>OBJETIVO DIARIO</Text>
            <Text style={{ fontSize: 18, color: c.ink, fontFamily: Fonts.serif }}>
              {goal ? `${Math.round(goal.calories)} kcal` : 'Sin definir'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>AGENDADO</Text>
            <Text style={{ fontSize: 18, color: c.ink, fontFamily: Fonts.serif }}>{daysWithPlan} / 7 días</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>MEDIA/DÍA</Text>
            <Text style={{ fontSize: 18, color: c.ink, fontFamily: Fonts.serif }}>
              {daysWithPlan > 0 ? `${Math.round(weekPlanned / daysWithPlan)}` : '—'}
              <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}> kcal</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* La semana COMPLETA frente al objetivo semanal: es donde se ve el margen
          que queda para las comidas libres, que es como el usuario piensa la
          semana (un día flojo compensa uno fuerte). */}
      {goal ? (
        <View style={[styles.card, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <Text style={[styles.miniLabel, { flex: 1, color: c.inkSoft, fontFamily: Fonts.sans }]}>
              TODA LA SEMANA
            </Text>
            <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
              <Text style={{ fontWeight: '700', color: weekFitColor(c, weekPlanned, goal.calories * 7, daysWithPlan) }}>
                {Math.round(weekPlanned).toLocaleString('es-ES')}
              </Text>
              {` de ${Math.round(goal.calories * 7).toLocaleString('es-ES')} kcal`}
            </Text>
          </View>
          <Bar
            value={weekPlanned}
            goal={goal.calories * 7}
            color={weekFitColor(c, weekPlanned, goal.calories * 7, daysWithPlan)}
          />
          {/* El margen solo significa "hueco para comidas libres" si la semana
              está entera: con días vacíos, lo que sobra es plan por hacer. */}
          <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16, marginTop: 6 }}>
            {daysWithPlan < 7
              ? `Te quedan ${7 - daysWithPlan} día${7 - daysWithPlan === 1 ? '' : 's'} sin planificar, así que este total todavía va a subir.`
              : weekMargin > 0
                ? `La semana entera está planificada y te sobran ${Math.round(weekMargin).toLocaleString('es-ES')} kcal.${
                    freeMeals
                      ? ` Es el hueco que te he dejado para tus ${freeMeals} comida${freeMeals === 1 ? '' : 's'} libre${freeMeals === 1 ? '' : 's'}: al comer fuera, borra del plan la comida que te saltes.`
                      : ' '
                  }`.trim()
                : `Te has pasado ${Math.round(-weekMargin).toLocaleString('es-ES')} kcal en el total de la semana. Un día flojo lo compensa.`}
          </Text>
        </View>
      ) : null}

      {/* Aviso PERSISTENTE de lo que falta: al autocompletar se decía en la
          burbuja, que se va sola, y después no quedaba ni rastro de qué huecos
          habían quedado. Vale igual para los que dejas tú a mano. */}
      {emptySlots.length > 0 ? (
        <View style={[styles.gapNotice, { borderColor: c.macroCarbs, backgroundColor: c.note }]}>
          <Ionicons name="alert-circle-outline" size={15} color={c.macroCarbs} />
          <Text style={{ flex: 1, fontSize: 11.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 16 }}>
            <Text style={{ fontWeight: '700' }}>
              {emptySlots.length === 1
                ? 'Queda 1 comida sin planificar'
                : `Quedan ${emptySlots.length} comidas sin planificar`}
            </Text>
            : {describeEmptySlots(emptySlots)}.
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
          {editing
            ? 'Toca la ✕ de una casilla para vaciarla, o "vaciar" bajo un día'
            : 'Desliza para ver la semana · toca una casilla para editarla'}
        </Text>
        {/* Guardar la semana, al lado de Editar: es donde se piensa en la
            semana entera, no en los ajustes de la cuenta. Se esconde al editar
            porque ahí se está vaciando, no archivando, y porque el aviso del
            modo edición es largo y los tres juntos no caben en 375. */}
        {!editing ? (
          <Pressable
            onPress={handleSaveWeek}
            disabled={histBusy || !user || !weekHasContent}
            style={[styles.chip, { borderColor: c.line }, (!weekHasContent || histBusy) && { opacity: 0.45 }]}
            accessibilityRole="button"
            accessibilityLabel="Guardar esta semana en el historial"
          >
            <Ionicons name="bookmark-outline" size={13} color={c.inkSoft} />
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.inkSoft, fontFamily: Fonts.sans }}>
              Guardar
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            setEditing((e) => !e);
            setConfirmClearWeek(false);
          }}
          style={[
            styles.chip,
            editing ? { borderColor: c.terra, backgroundColor: c.terraSoft } : { borderColor: c.line },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: editing }}
          accessibilityLabel={editing ? 'Salir del modo edición' : 'Editar el cuadrante'}
        >
          <Ionicons name={editing ? 'checkmark' : 'create-outline'} size={13} color={editing ? c.terra : c.inkSoft} />
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: '700',
              color: editing ? c.terra : c.inkSoft,
              fontFamily: Fonts.sans,
            }}
          >
            {editing ? 'Listo' : 'Editar'}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {/* Columna fija: las comidas del día, una por fila */}
        <View>
          <View style={{ height: HEAD_H }} />
          {mealTitles.map((t) => (
            <View key={t} style={[styles.mealLabelCell, { height: ROW_H }]}>
              <Text
                style={{ fontSize: 9.5, fontWeight: '700', letterSpacing: 0.2, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'right' }}
                numberOfLines={2}
              >
                {t.toUpperCase()}
              </Text>
            </View>
          ))}
          {/* Hueco que compensa la fila de "vaciar" de cada día: sin él, la
              columna de etiquetas y la de días dejan de cuadrar al editar. */}
          {editing ? <View style={{ height: CLEAR_ROW_H }} /> : null}
          <View style={[styles.mealLabelCell, { height: TOTAL_H }]}>
            <Text
              style={{ fontSize: 9.5, fontWeight: '700', letterSpacing: 0.2, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'right' }}
            >
              TOTAL
            </Text>
          </View>
        </View>

        {/* Días, con scroll lateral */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {weekPlan.map((d, i) => {
              const isToday = i === today;
              const t = perDay[i];
              const kcalColor = fitColor(c, t.calories, goal?.calories);
              return (
                <View key={d.day} style={{ width: DAY_COL_W }}>
                  <Pressable
                    onPress={() => onOpenDay(i)}
                    style={[styles.dayHeadCell, { height: HEAD_H }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ${DAY_NAMES[i]}`}
                  >
                    <Text style={{ fontSize: 14, color: isToday ? c.terra : c.ink, fontFamily: Fonts.serif }}>
                      {DAY_LETTERS[i]}
                    </Text>
                    {isToday ? <View style={[styles.todayDot, { backgroundColor: c.terra }]} /> : null}
                  </Pressable>

                  {d.meals.map((meal) => {
                    const names = meal.recipes.map((r) => r.name);
                    return (
                      // La ✕ va como HERMANA de la casilla, no dentro: anidada,
                      // el toque caía en las dos y en web salía un <button>
                      // dentro de otro.
                      <View key={meal.id}>
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: '/anadir',
                              params: { day: d.day, mealId: meal.id, title: meal.title },
                            })
                          }
                          style={[
                            styles.gridCell,
                            { height: ROW_H - 5, borderColor: c.line, backgroundColor: c.surface },
                            isToday && { borderColor: c.terra, backgroundColor: c.terraSoft },
                            names.length === 0 && styles.gridCellEmpty,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${meal.title} del ${DAY_NAMES[i]}`}
                        >
                          {names.length === 0 ? (
                            <Ionicons name="add" size={15} color={c.inkSoft} />
                          ) : (
                            <>
                              {names.slice(0, 2).map((n, k) => (
                                <Text
                                  key={k}
                                  numberOfLines={2}
                                  style={{ fontSize: 9.5, lineHeight: 12, color: c.ink, fontFamily: Fonts.sans }}
                                >
                                  {n}
                                </Text>
                              ))}
                              {names.length > 2 ? (
                                <Text style={{ fontSize: 8.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                                  +{names.length - 2} más
                                </Text>
                              ) : null}
                            </>
                          )}
                        </Pressable>

                        {/* Vacía la casilla entera. Para quitar UNA receta de un
                            hueco con varias, está la vista Hoy. */}
                        {editing && names.length > 0 ? (
                          <Pressable
                            onPress={() => emptyMeal(d.day, meal.id)}
                            hitSlop={8}
                            style={[styles.cellClear, { backgroundColor: c.terra, borderColor: c.ground }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Vaciar ${meal.title} del ${DAY_NAMES[i]}`}
                          >
                            <Ionicons name="close" size={11} color="#FFF" />
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}

                  {editing ? (
                    <Pressable
                      onPress={() => emptyDay(d.day)}
                      style={[styles.dayClear, { borderColor: c.terra }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Vaciar ${DAY_NAMES[i]} entero`}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: c.terra, fontFamily: Fonts.sans }}>
                        vaciar
                      </Text>
                    </Pressable>
                  ) : null}

                  {/* Total del día: kcal, barra frente al objetivo y macros */}
                  <View style={[styles.dayTotalCell, { height: TOTAL_H }]}>
                    {t.calories > 0 ? (
                      <>
                        <Text style={{ fontSize: 12, color: kcalColor, fontFamily: Fonts.serif }}>
                          {Math.round(t.calories)}
                          <Text style={{ fontSize: 7.5, color: c.inkSoft, fontFamily: Fonts.sans }}> kcal</Text>
                        </Text>
                        <View style={{ width: '100%' }}>
                          <Bar value={t.calories} goal={goal?.calories} color={kcalColor} height={4} />
                        </View>
                        <Text style={{ fontSize: 7.5, color: c.inkSoft, fontFamily: Fonts.sans }} numberOfLines={1}>
                          <Text style={{ color: fitColor(c, t.protein, goal?.protein) }}>{Math.round(t.protein)}P</Text>
                          {' · '}
                          <Text style={{ color: fitColor(c, t.carbs, goal?.carbs) }}>{Math.round(t.carbs)}C</Text>
                          {' · '}
                          <Text style={{ color: fitColor(c, t.fat, goal?.fat) }}>{Math.round(t.fat)}G</Text>
                        </Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 10, color: c.inkSoft, fontFamily: Fonts.sans }}>—</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Lo planificado día a día, en barras: dónde falta y dónde sobra */}
      <View style={[styles.card, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}>
        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>PLANIFICADO POR DÍA</Text>
        {weekPlan.map((d, i) => {
          const t = perDay[i];
          const empty = t.calories === 0;
          const kcalColor = fitColor(c, t.calories, goal?.calories);
          return (
            <Pressable
              key={d.day}
              onPress={() => onOpenDay(i)}
              style={[styles.dayRow, { borderColor: c.line }]}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${DAY_NAMES[i]}`}
            >
              <Text
                style={{ width: 18, fontSize: 13, color: i === today ? c.terra : c.ink, fontFamily: Fonts.serif }}
              >
                {DAY_LETTERS[i]}
              </Text>
              <View style={{ flex: 1, gap: 3 }}>
                <Bar value={t.calories} goal={goal?.calories} color={empty ? c.chip : kcalColor} height={7} />
                <Text style={{ fontSize: 9.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                  {empty
                    ? 'Sin nada planificado'
                    : `${Math.round(t.protein)} P · ${Math.round(t.carbs)} C · ${Math.round(t.fat)} G`}
                </Text>
              </View>
              <Text style={{ width: 62, textAlign: 'right', fontSize: 12, color: kcalColor, fontFamily: Fonts.sans, fontWeight: '700' }}>
                {empty ? '—' : Math.round(t.calories)}
                <Text style={{ fontSize: 8.5, fontWeight: '400', color: c.inkSoft }}>{empty ? '' : ' kcal'}</Text>
              </Text>
            </Pressable>
          );
        })}
        <Text style={{ fontSize: 10, color: c.inkSoft, fontFamily: Fonts.sans, marginTop: 7 }}>
          {goal
            ? `Cada barra se llena hasta tu objetivo: ${Math.round(goal.calories)} kcal · ${Math.round(goal.protein)} P · ${Math.round(goal.carbs)} C · ${Math.round(goal.fat)} G al día. Verde = en objetivo, ámbar = cerca, terracota = lejos.`
            : 'Define tu objetivo diario en Perfil para que las barras se comparen con algo.'}
        </Text>
      </View>

      {/* Vaciar la semana entera: solo en modo edición y con confirmación, que
          se cargaría los 7 días de una vez. */}
      {editing ? (
        confirmClearWeek ? (
          <View style={[styles.card, { borderColor: c.terra, backgroundColor: c.terraSoft, gap: 9 }]}>
            <Text style={{ fontSize: 13, color: c.ink, fontFamily: Fonts.sans, lineHeight: 19 }}>
              ¿Vaciar los siete días? Se queda todo el cuadrante en blanco y no se puede deshacer.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={emptyWeek}
                style={[styles.chip, { backgroundColor: c.terra, borderColor: c.terra }]}
                accessibilityRole="button"
                accessibilityLabel="Sí, vaciar la semana entera"
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF', fontFamily: Fonts.sans }}>
                  Sí, vaciar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirmClearWeek(false)}
                style={[styles.chip, { borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirmClearWeek(true)}
            style={[styles.clearWeekBtn, { borderColor: c.terra }]}
            accessibilityRole="button"
            accessibilityLabel="Vaciar la semana entera"
          >
            <Ionicons name="trash-outline" size={14} color={c.terra} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.terra, fontFamily: Fonts.sans }}>
              Vaciar la semana entera
            </Text>
          </Pressable>
        )
      ) : null}

      {/* El historial solo aparece cuando hay algo guardado: en blanco sería
          una caja vacía explicando un botón que está tres dedos más arriba. */}
      {histNotice ? (
        <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
          {histNotice}
        </Text>
      ) : null}
      {sortedHistory.length > 0 ? (
        <View style={[styles.card, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}>
          <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans, marginBottom: 2 }]}>
            SEMANAS GUARDADAS
          </Text>
          {sortedHistory.map((entry) => (
            <View key={entry.id} style={[styles.historyRow, { borderColor: c.line }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ fontSize: 12.5, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }}
                  numberOfLines={1}
                >
                  {entry.label}
                </Text>
                <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                  {new Date(entry.savedAt).toLocaleDateString('es-ES')}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  runHist(() => restoreWeek(user!.uid, entry.days), 'Semana restaurada en el cuadrante.')
                }
                disabled={histBusy}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Restaurar ${entry.label}`}
              >
                <Text style={{ color: c.sage, fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans }}>
                  Restaurar
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  runHist(() => deleteWeekSnapshot(user!.uid, entry.id), 'Semana borrada del historial.')
                }
                disabled={histBusy}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Borrar ${entry.label}`}
              >
                <Text style={{ color: c.inkSoft, fontSize: 12, fontFamily: Fonts.sans }}>Borrar</Text>
              </Pressable>
            </View>
          ))}
          <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 15, marginTop: 6 }}>
            Restaurar reescribe los siete días del cuadrante con los de esa semana.
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleDownload}
        disabled={pdfBusy}
        style={[styles.downloadBtn, Shadows.card, { backgroundColor: c.terra }, pdfBusy && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Descargar cuadrante en PDF"
      >
        {pdfBusy ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="download-outline" size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
              Descargar cuadrante
            </Text>
          </>
        )}
      </Pressable>
      {pdfError ? (
        <Text style={{ fontSize: 12, color: c.terra, fontFamily: Fonts.sans }}>{pdfError}</Text>
      ) : (
        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
          En PDF apaisado, para imprimirlo y pegarlo en la nevera.
        </Text>
      )}
    </>
  );
}

export default function PlanScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthUser();
  const { weekPlan, loading } = useWeekPlan();
  const { profile, activeGoalMacros } = useProfile();
  const [view, setView] = useState<'hoy' | 'semana'>('hoy');
  // El día seleccionado vive aquí para que tocar una columna en Semana abra ese
  // día en Hoy.
  const [selectedDay, setSelectedDay] = useState(todayIndex());

  const firstName = (profile?.name || user?.displayName || user?.email || '').split(/[@ ]/)[0];
  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <PaperTexture />
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ScreenTitle
            compact
            eyebrow={dateLabel}
            title={firstName ? `Hola, ${firstName}` : 'Tu plan'}
          />
        </View>
        <View style={[styles.segment, { borderColor: c.line, backgroundColor: c.surface }]}>
          {(['hoy', 'semana'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[styles.segmentItem, view === v && { backgroundColor: c.terra }]}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: view === v ? '700' : '400',
                  color: view === v ? '#FFF' : c.inkSoft,
                  fontFamily: Fonts.sans,
                }}
              >
                {v === 'hoy' ? 'Hoy' : 'Semana'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.terra} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {view === 'hoy' ? (
            <HoyView weekPlan={weekPlan} goal={activeGoalMacros} selected={selectedDay} onSelect={setSelectedDay} />
          ) : (
            <SemanaView
              weekPlan={weekPlan}
              goal={activeGoalMacros}
              freeMeals={profile?.nutriInterview?.freeMealsPerWeek}
              onOpenDay={(i) => {
                setSelectedDay(i);
                setView('hoy');
              }}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  segmentItem: { paddingHorizontal: 13, paddingVertical: 7 },
  body: { paddingHorizontal: 18, paddingBottom: 24, gap: 10 },
  dayStrip: { flexDirection: 'row', gap: 5 },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 9,
    paddingVertical: 5,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.2,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  miniLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 1 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  gapNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1.2,
    borderRadius: Radii.card,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  emptySlot: {
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
  },
  mealCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealCardMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 46, height: 46, borderRadius: 10 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cookBtn: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderWidth: 1.2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: Radii.card,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  // ── Cuadrante ──
  mealLabelCell: {
    width: MEAL_COL_W,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 7,
    paddingBottom: 5,
  },
  dayHeadCell: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  todayDot: { width: 4, height: 4, borderRadius: 2 },
  gridCell: {
    borderWidth: 1.2,
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginRight: 5,
    marginBottom: 5,
    justifyContent: 'center',
    gap: 1,
  },
  gridCellEmpty: { borderStyle: 'dashed', backgroundColor: 'transparent', alignItems: 'center' },
  cellClear: {
    position: 'absolute',
    // Asomada por la esquina, pero con la mayor parte DENTRO de su casilla:
    // saliendo del todo parecía la ✕ de la fila de arriba.
    top: -3,
    right: 1,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayClear: {
    height: CLEAR_ROW_H - 5,
    marginRight: 5,
    marginBottom: 5,
    borderWidth: 1.2,
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTotalCell: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6, marginRight: 5 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, paddingVertical: 7 },
  clearWeekBtn: {
    flexDirection: 'row',
    gap: 7,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
