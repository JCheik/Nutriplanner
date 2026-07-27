import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { removeRecipeFromMeal, updateServings } from '@/firebase/plan-operations';
import { useProfile, useWeekPlan } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { useWeekDiary } from '@/hooks/use-week-diary';
import { shareWeekPdf } from '@/lib/week-pdf';
import type { DayPlan, GoalMacros, Macros, RecipeInstance } from '@/lib/types';

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

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const CELL_W = 132;
const ROW_H = 82;

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const c = useTheme();
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>{label}</Text>
        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
          {Math.round(value)} / {Math.round(goal)} g
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 99, backgroundColor: c.chip, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, borderRadius: 99, backgroundColor: color }} />
      </View>
    </View>
  );
}

/**
 * Hero card (boceto 1): anillo de kcal RESTANTES del objetivo (lo comido
 * descuenta, vía los checks) + barras de macros comidos/objetivo, y una línea
 * con lo planificado del día. Todo sobre el plan — nunca registro libre.
 */
function GoalHero({ planned, eaten, goal }: { planned: Macros; eaten: Macros; goal: GoalMacros | null }) {
  const c = useTheme();

  if (!goal) {
    return (
      <View style={[styles.card, { borderColor: c.line, backgroundColor: c.surface }]}>
        <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 19 }}>
          Configura tu objetivo diario en la calculadora (por ahora en la web, en Mi Laboratorio) para ver aquí
          cómo encaja el plan de cada día.
        </Text>
      </View>
    );
  }

  const remaining = Math.round(goal.calories - eaten.calories);

  return (
    <View style={[styles.card, styles.heroCard, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
      <View style={[styles.ring, { borderColor: c.terra, backgroundColor: c.surface }]}>
        <Text style={{ fontSize: 19, fontWeight: '800', color: c.ink, fontFamily: Fonts.serif }}>
          {Math.abs(remaining)}
        </Text>
        <Text style={{ fontSize: 9, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
          {remaining >= 0 ? 'kcal restantes' : 'kcal de más'}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        <MacroBar label="Proteína" value={eaten.protein} goal={goal.protein} color={c.macroProtein} />
        <MacroBar label="Carbohidr." value={eaten.carbs} goal={goal.carbs} color={c.macroCarbs} />
        <MacroBar label="Grasas" value={eaten.fat} goal={goal.fat} color={c.macroFat} />
        <Text style={{ fontSize: 10, color: c.inkSoft, fontFamily: Fonts.sans }}>
          Agendado hoy: {Math.round(planned.calories)} kcal · marca ✓ lo que vayas comiendo
        </Text>
      </View>
    </View>
  );
}

function HoyView({ weekPlan, goal }: { weekPlan: DayPlan[]; goal: GoalMacros | null }) {
  const c = useTheme();
  const router = useRouter();
  const { user } = useAuthUser();
  const [selected, setSelected] = useState(todayIndex());
  const day = weekPlan[selected];
  const totals = useMemo(() => dayTotals(day), [day]);
  const { weekKeys, isEaten, logPlanRecipe, unlogPlanRecipe, eatenTotals } = useWeekDiary();
  const dateKey = weekKeys[selected];
  const eaten = eatenTotals(dateKey);

  const toggleEaten = (r: RecipeInstance) => {
    if (!user) return;
    const action = isEaten(dateKey, r.instanceId)
      ? unlogPlanRecipe(dateKey, r.instanceId)
      : logPlanRecipe(dateKey, r);
    action.catch(() => {});
  };

  // Writes are fire-and-forget over the live subscription (like the web); a
  // failure just leaves the list as-is, so no local optimistic state needed.
  const changeServings = (mealId: string, r: RecipeInstance, delta: number) => {
    if (!user) return;
    const next = Math.max(1, (r.servingsEaten ?? 1) + delta);
    if (next !== (r.servingsEaten ?? 1)) {
      updateServings(user.uid, day.day, mealId, r.instanceId, next).catch(() => {});
    }
  };
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
              onPress={() => setSelected(i)}
              style={[
                styles.dayPill,
                { borderColor: c.line, backgroundColor: c.surface },
                active && { backgroundColor: c.terra, borderColor: c.terra },
              ]}
              accessibilityRole="button"
              accessibilityLabel={d.day}
            >
              <Text style={{ fontSize: 10, color: active ? '#FFF' : c.inkSoft, fontFamily: Fonts.sans }}>
                {DAY_LETTERS[i]}
              </Text>
              <Text style={{ fontSize: 8, color: active ? '#FFF' : c.terra, opacity: planned ? 1 : 0 }}>•</Text>
            </Pressable>
          );
        })}
      </View>

      <GoalHero planned={totals} eaten={eaten} goal={goal} />

      {day.meals.map((meal) => (
        <View key={meal.id} style={{ gap: 6 }}>
          <Text style={[styles.sectionLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
            {meal.title.toUpperCase()}
          </Text>
          {meal.recipes.map((r) => {
            const mac = instanceMacros(r);
            const eatenNow = isEaten(dateKey, r.instanceId);
            return (
              <View key={r.instanceId} style={[styles.card, { borderColor: c.line, backgroundColor: c.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Text
                    style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }}
                    numberOfLines={2}
                  >
                    {r.name}
                  </Text>
                  <Pressable
                    onPress={() => removeRecipe(meal.id, r)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${r.name}`}
                  >
                    <Ionicons name="close" size={16} color={c.inkSoft} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => changeServings(meal.id, r, -1)}
                    style={[styles.stepBtn, { borderColor: c.line }]}
                    accessibilityRole="button"
                    accessibilityLabel="Una ración menos"
                  >
                    <Ionicons name="remove" size={14} color={c.inkSoft} />
                  </Pressable>
                  <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                    {r.servingsEaten ?? 1} rac · {Math.round(mac.calories)} kcal · {Math.round(mac.protein)} P
                  </Text>
                  <Pressable
                    onPress={() => changeServings(meal.id, r, 1)}
                    style={[styles.stepBtn, { borderColor: c.line }]}
                    accessibilityRole="button"
                    accessibilityLabel="Una ración más"
                  >
                    <Ionicons name="add" size={14} color={c.inkSoft} />
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    onPress={() => toggleEaten(r)}
                    style={[
                      styles.eatenCheck,
                      { borderColor: c.line },
                      eatenNow && { backgroundColor: c.terra, borderColor: c.terra },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: eatenNow }}
                    accessibilityLabel={`Me he comido ${r.name}`}
                  >
                    {eatenNow ? <Ionicons name="checkmark" size={13} color="#FFF" /> : null}
                  </Pressable>
                </View>
              </View>
            );
          })}
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
        </View>
      ))}
    </>
  );
}

/**
 * Semana (boceto 2): el cuadrante días × comidas. Celdas grandes y legibles con
 * scroll lateral (en un móvil no caben 4 franjas a la vez sin que el texto se
 * vuelva ilegible), columna de días fija a la izquierda, y cada celda es
 * pulsable para añadir/editar esa comida.
 */
function SemanaView({ weekPlan, goal }: { weekPlan: DayPlan[]; goal: GoalMacros | null }) {
  const c = useTheme();
  const router = useRouter();
  const today = todayIndex();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const mealTitles = weekPlan[0]?.meals.map((m) => m.title) ?? [];
  const perDay = useMemo(() => weekPlan.map(dayTotals), [weekPlan]);
  const weekPlanned = perDay.reduce((sum, d) => sum + d.calories, 0);
  const daysWithPlan = perDay.filter((d) => d.calories > 0).length;

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
      <View style={[styles.card, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>OBJETIVO DIARIO</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
              {goal ? `${Math.round(goal.calories)} kcal` : 'Sin definir'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>AGENDADO</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
              {daysWithPlan} / 7 días
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>MEDIA/DÍA</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
              {daysWithPlan > 0 ? `${Math.round(weekPlanned / daysWithPlan)}` : '—'}
              <Text style={{ fontSize: 11, fontWeight: '400', color: c.inkSoft, fontFamily: Fonts.sans }}> kcal</Text>
            </Text>
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
        Desliza la tabla para ver todas las comidas · toca una casilla para editarla
      </Text>

      <View style={{ flexDirection: 'row' }}>
        {/* Columna de días, fija */}
        <View>
          <View style={[styles.gridHeadCell, { width: 54 }]} />
          {weekPlan.map((d, i) => (
            <View key={d.day} style={[styles.gridDayCell, { height: ROW_H, borderColor: c.line }]}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: i === today ? c.terra : c.ink,
                  fontFamily: Fonts.serif,
                }}
              >
                {DAY_LETTERS[i]}
              </Text>
              <Text style={{ fontSize: 9.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                {perDay[i].calories > 0 ? `${Math.round(perDay[i].calories)}` : '—'}
              </Text>
              {goal && perDay[i].calories > 0 ? (
                <Text
                  style={{
                    fontSize: 8.5,
                    fontFamily: Fonts.sans,
                    color: perDay[i].calories > goal.calories * 1.1 ? c.terra : c.sage,
                  }}
                >
                  {perDay[i].calories > goal.calories * 1.1 ? 'de más' : 'ok'}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Franjas, con scroll lateral */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={{ flexDirection: 'row' }}>
              {mealTitles.map((t) => (
                <View key={t} style={[styles.gridHeadCell, { width: CELL_W }]}>
                  <Text
                    style={{ fontSize: 10.5, fontWeight: '700', color: c.inkSoft, fontFamily: Fonts.sans }}
                    numberOfLines={1}
                  >
                    {t.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            {weekPlan.map((d, i) => (
              <View key={d.day} style={{ flexDirection: 'row' }}>
                {d.meals.map((meal) => {
                  const names = meal.recipes.map((r) => r.name);
                  const isToday = i === today;
                  return (
                    <Pressable
                      key={meal.id}
                      onPress={() =>
                        router.push({
                          pathname: '/anadir',
                          params: { day: d.day, mealId: meal.id, title: meal.title },
                        })
                      }
                      style={[
                        styles.gridCell,
                        { width: CELL_W, height: ROW_H, borderColor: c.line, backgroundColor: c.surface },
                        isToday && { borderColor: c.terra, backgroundColor: c.terraSoft },
                        names.length === 0 && styles.gridCellEmpty,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${meal.title} del ${d.day}`}
                    >
                      {names.length === 0 ? (
                        <Ionicons name="add" size={16} color={c.inkSoft} />
                      ) : (
                        <>
                          {names.slice(0, 2).map((n, k) => (
                            <Text
                              key={k}
                              numberOfLines={2}
                              style={{ fontSize: 10.5, lineHeight: 13.5, color: c.ink, fontFamily: Fonts.sans }}
                            >
                              {n}
                            </Text>
                          ))}
                          {names.length > 2 ? (
                            <Text style={{ fontSize: 9.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                              +{names.length - 2} más
                            </Text>
                          ) : null}
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <Pressable
        onPress={handleDownload}
        disabled={pdfBusy}
        style={[styles.downloadBtn, { backgroundColor: c.terra }, pdfBusy && { opacity: 0.6 }]}
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

  const firstName = (profile?.name || user?.displayName || user?.email || '').split(/[@ ]/)[0];
  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }} numberOfLines={1}>
            {firstName ? `Hola, ${firstName}` : 'Tu plan'}
          </Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, textTransform: 'capitalize' }}>
            {dateLabel}
          </Text>
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
            <HoyView weekPlan={weekPlan} goal={activeGoalMacros} />
          ) : (
            <SemanaView weekPlan={weekPlan} goal={activeGoalMacros} />
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
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  miniLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 1 },
  emptySlot: {
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderWidth: 1.2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eatenCheck: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 7,
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
  gridHeadCell: { height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  gridDayCell: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    paddingRight: 4,
  },
  gridCell: {
    borderWidth: 1.2,
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 6,
    marginLeft: 5,
    marginBottom: 5,
    justifyContent: 'center',
    gap: 1,
  },
  gridCellEmpty: { borderStyle: 'dashed', backgroundColor: 'transparent', alignItems: 'center' },
});
