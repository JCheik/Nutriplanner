import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot } from '@/components/chefie-mascot';
import { PaperTexture } from '@/components/paper-texture';
import { ScreenTitle } from '@/components/screen-scaffold';
import { PlatesStepper } from '@/components/plates-stepper';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { addRecipeToMeal } from '@/firebase/plan-operations';
import { useProfile, useRecipes, useWeekPlan } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { placementFor, plateMacros, platesLabel, portionFor } from '@/lib/serving-utils';

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Índice del día de hoy con la semana empezando en lunes. */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

/**
 * Añadir una receta al plan eligiendo día, franja y raciones. Se abre desde el
 * detalle de la receta: hasta ahora, para planificar algo que estabas mirando
 * había que salir a Plan, buscar la franja y volver a buscar la receta.
 *
 * El camino inverso (desde una franja vacía, buscando receta) sigue estando en
 * `/anadir`; este es el mismo destino desde el otro extremo.
 */
export default function PlanAnadirScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  const { recipeId, global: isGlobal } = useLocalSearchParams<{ recipeId?: string; global?: string }>();
  const { userRecipes, globalRecipes } = useRecipes();
  const { weekPlan } = useWeekPlan();
  const { activeGoalMacros, portionFactor } = useProfile();

  const [dayIndex, setDayIndex] = useState(todayIndex());
  const [mealId, setMealId] = useState<string | null>(null);
  /**
   * Platos propuestos. `null` = todavía no lo ha tocado el usuario, y entonces
   * manda `placementFor` —el mismo cálculo que la web—, que además cambia si
   * eliges otra franja: un desayuno no pide lo mismo que un almuerzo. En cuanto
   * lo ajusta a mano, su número gana y deja de recalcularse solo.
   */
  const [platesOverride, setPlatesOverride] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ day: string; meal: string } | null>(null);

  const recipe = useMemo(() => {
    const pool = isGlobal === '1' ? globalRecipes : userRecipes;
    return pool.find((r) => r.id === recipeId) ?? [...userRecipes, ...globalRecipes].find((r) => r.id === recipeId);
  }, [recipeId, isGlobal, userRecipes, globalRecipes]);

  const day = weekPlan[dayIndex];
  const meals = day?.meals ?? [];
  // Si aún no se ha tocado nada, se propone la franja según la hora que sea.
  const selectedMealId = mealId ?? meals[suggestedMealIndex(meals.length)]?.id ?? null;
  const per = recipe ? plateMacros(recipe, portionFactor) : null;
  const suggestedPlates = recipe
    ? placementFor(recipe, meals.find((m) => m.id === selectedMealId)?.mealTypes, activeGoalMacros, portionFactor).plates
    : 1;
  const plates = platesOverride ?? suggestedPlates;
  const setPlates = setPlatesOverride;

  const handleAdd = async () => {
    if (!user || !recipe || !selectedMealId || !day || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addRecipeToMeal(user.uid, day.day, selectedMealId, recipe, plates, portionFor(recipe, portionFactor));
      setDone({ day: day.day, meal: meals.find((m) => m.id === selectedMealId)?.title ?? '' });
    } catch {
      setError('No se pudo añadir al plan. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
          No encuentro esa receta.
        </Text>
      </View>
    );
  }

  // Estado de confirmación: evita volver a ciegas y ofrece los dos siguientes
  // pasos naturales (verlo en el plan, o seguir colocando la misma receta).
  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
        <PaperTexture />
        <View style={styles.doneBody}>
          <ChefieMascot pose="thumbsup" size={92} />
          <Text style={{ fontSize: 20, color: c.ink, fontFamily: Fonts.serif, textAlign: 'center' }}>
            Añadido al plan
          </Text>
          <Text style={{ fontSize: 13.5, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center', lineHeight: 20 }}>
            {recipe.name} · {done.day}, {done.meal.toLowerCase()}
            {plates !== 1 ? ` · ${platesLabel(plates)}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={() => router.dismissTo('/')}
              style={[styles.cta, Shadows.card, { backgroundColor: c.terra }]}
              accessibilityRole="button"
              accessibilityLabel="Ver el plan"
            >
              <Text style={{ color: '#FFF', fontSize: 13.5, fontWeight: '700', fontFamily: Fonts.sans }}>
                Ver el plan
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDone(null)}
              style={[styles.cta, { borderWidth: 1.5, borderColor: c.line }]}
              accessibilityRole="button"
              accessibilityLabel="Añadir en otro día"
            >
              <Text style={{ color: c.inkSoft, fontSize: 13.5, fontWeight: '700', fontFamily: Fonts.sans }}>
                En otro día
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <PaperTexture />
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ScreenTitle compact eyebrow="Añadir al plan" title={recipe.name} />
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
        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>QUÉ DÍA</Text>
        <View style={styles.dayStrip}>
          {weekPlan.map((d, i) => {
            const active = i === dayIndex;
            const hasPlan = d.meals.some((m) => m.recipes.length > 0);
            return (
              <Pressable
                key={d.day}
                onPress={() => {
                  setDayIndex(i);
                  setMealId(null);
                }}
                style={[
                  styles.dayPill,
                  { borderColor: c.line, backgroundColor: c.surface },
                  active && [{ backgroundColor: c.terra, borderColor: c.terra }, Shadows.card],
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={d.day}
              >
                <Text style={{ fontSize: 13, color: active ? '#FFF' : c.inkSoft, fontFamily: Fonts.serif }}>
                  {DAY_LETTERS[i]}
                </Text>
                <Text style={{ fontSize: 8, color: active ? '#FFF' : c.terra, opacity: hasPlan ? 1 : 0 }}>•</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>EN QUÉ COMIDA</Text>
        <View style={{ gap: 7 }}>
          {meals.map((meal) => {
            const active = meal.id === selectedMealId;
            return (
              <Pressable
                key={meal.id}
                onPress={() => setMealId(meal.id)}
                style={[
                  styles.mealRow,
                  { borderColor: active ? c.terra : c.line, backgroundColor: active ? c.terraSoft : c.surface },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={meal.title}
              >
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={17}
                  color={active ? c.terra : c.inkSoft}
                />
                <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }}>
                  {meal.title}
                </Text>
                <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                  {meal.recipes.length === 0
                    ? 'vacío'
                    : `${meal.recipes.length} ${meal.recipes.length === 1 ? 'plato' : 'platos'}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>CUÁNTOS PLATOS</Text>
        <View style={[styles.servingsRow, { borderColor: c.line, backgroundColor: c.surface }]}>
          {/* El tamaño de cada plato ya lo pone el factor de ración del perfil;
              aquí solo se cuentan. El stepper trae sus propios ± con el tope. */}
          <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <PlatesStepper value={plates} onChange={setPlates} label="platos" />
            {per ? (
              <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
                {Math.round(per.calories * plates)} kcal · {Math.round(per.protein * plates)} P
              </Text>
            ) : null}
          </View>
        </View>

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          onPress={handleAdd}
          disabled={busy || !selectedMealId}
          style={[
            styles.cta,
            Shadows.card,
            { backgroundColor: c.terra, flex: 1 },
            (busy || !selectedMealId) && { opacity: 0.55 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Añadir al plan"
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans }}>
              Añadir al plan
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Franja propuesta según la hora: antes de las 11 desayuno, hasta las 16
 * almuerzo, hasta las 19 merienda, y si no cena. Solo es el valor inicial.
 */
function suggestedMealIndex(mealCount: number): number {
  if (mealCount === 0) return 0;
  const h = new Date().getHours();
  const idx = h < 11 ? 0 : h < 16 ? 1 : h < 19 ? 2 : 3;
  return Math.min(idx, mealCount - 1);
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingBottom: 10 },
  closeBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 16, gap: 8 },
  miniLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginTop: 8 },
  dayStrip: { flexDirection: 'row', gap: 5 },
  dayPill: { flex: 1, alignItems: 'center', borderWidth: 1.2, borderRadius: 9, paddingVertical: 7 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderWidth: 1.2,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { flexDirection: 'row', paddingHorizontal: 18, paddingTop: 6 },
  cta: { borderRadius: Radii.card, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  doneBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 8 },
});
