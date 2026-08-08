import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyRecipeFilters, EMPTY_FILTERS, RecipeFilters, type RecipeFilterState } from '@/components/recipe-filters';
import { ServingsInput } from '@/components/servings-input';
import { Fonts, Radii } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { addRecipeToMeal, removeRecipeFromMeal, updateServings } from '@/firebase/plan-operations';
import { useRecipes, useWeekPlan } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { clampServings, perServingMacros, servingsLabel } from '@/lib/serving-utils';
import { normalizeText } from '@/lib/utils';
import type { MealCategory, Recipe, RecipeInstance } from '@/lib/types';

/**
 * "Añadir comida" (boceto 3): hoja modal que sabe a qué día y franja añade.
 * Busca en propias + Nutrilp; tocar «＋» añade 1 ración y vuelve al plan.
 */
export default function AnadirScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  const { day, mealId, title } = useLocalSearchParams<{ day: string; mealId: string; title?: string }>();
  const { userRecipes, globalRecipes, loading } = useRecipes();
  const { weekPlan } = useWeekPlan();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Arranca filtrando por el tipo de la franja a la que vas a añadir (si el
  // título coincide con una categoría conocida), que es lo que casi siempre
  // quieres al pulsar "Añadir cena".
  const [filters, setFilters] = useState<RecipeFilterState>(() => {
    const guess = normalizeText(title ?? '');
    const known: MealCategory[] = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack', 'postre'];
    const match = known.find((k) => guess.includes(k));
    return match ? { ...EMPTY_FILTERS, categories: [match] } : EMPTY_FILTERS;
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const list = useMemo(() => {
    const q = normalizeText(search.trim());
    const all = [...userRecipes, ...globalRecipes];
    const searched = q
      ? all.filter(
          (r) => normalizeText(r.name).includes(q) || r.ingredients.some((i) => normalizeText(i.name).includes(q))
        )
      : all;
    return applyRecipeFilters(searched, filters);
  }, [userRecipes, globalRecipes, search, filters]);

  // Lo que ya está puesto en esta franja, leído del plan en vivo.
  const current = useMemo(() => {
    const dayPlan = weekPlan.find((d) => d.day === day);
    return dayPlan?.meals.find((m) => m.id === mealId)?.recipes ?? [];
  }, [weekPlan, day, mealId]);

  const setServingsTo = (r: RecipeInstance, next: number) => {
    if (!user || !day || !mealId) return;
    updateServings(user.uid, day, mealId, r.instanceId, clampServings(next)).catch(() =>
      setError('No se pudo cambiar las raciones.')
    );
  };

  const bumpServings = (r: RecipeInstance, delta: number) => setServingsTo(r, (r.servingsEaten ?? 1) + delta);

  const dropRecipe = (r: RecipeInstance) => {
    if (!user || !day || !mealId) return;
    removeRecipeFromMeal(user.uid, day, mealId, r.instanceId).catch(() =>
      setError('No se pudo quitar.')
    );
  };

  const handleAdd = async (recipe: Recipe) => {
    if (!user || !day || !mealId || busyId) return;
    setBusyId(recipe.id);
    setError(null);
    try {
      await addRecipeToMeal(user.uid, day, mealId, recipe, 1);
      router.back();
    } catch {
      setError('No se pudo añadir. Revisa tu conexión e inténtalo de nuevo.');
      setBusyId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={{ flex: 1, fontSize: 19, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
            Añadir · {title || 'comida'}, {day}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { borderColor: c.line }]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Text style={{ color: c.inkSoft, fontSize: 15 }}>✕</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.search, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
          placeholder="Busca receta o alimento…"
          placeholderTextColor={c.inkSoft}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        <RecipeFilters
          value={filters}
          onChange={setFilters}
          open={filtersOpen}
          onToggleOpen={() => setFiltersOpen((o) => !o)}
        />
        {error ? (
          <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text>
        ) : null}
      </View>

      {/* Lo que YA hay en este hueco. Faltaba: al tocar una casilla ocupada del
          cuadrante se llegaba aquí y solo se podía añadir MÁS, sin ver ni tocar
          lo que estaba puesto. Y es también donde se ajustan las raciones, que
          en la tarjeta de Hoy estorbaban. */}
      {current.length > 0 ? (
        <View style={styles.currentBox}>
          <Text style={[styles.currentLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>YA EN ESTE HUECO</Text>
          {current.map((r) => (
            <View key={r.instanceId} style={[styles.row, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
              <Pressable
                onPress={() => router.push({ pathname: '/receta/[id]', params: { id: r.id } })}
                style={{ flex: 1, minWidth: 0 }}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${r.name}`}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }} numberOfLines={2}>
                  {r.name}
                </Text>
                <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
                  {servingsLabel(r.servingsEaten ?? 1)} · toca para verla
                </Text>
              </Pressable>
              <Pressable
                onPress={() => bumpServings(r, -1)}
                style={[styles.stepBtn, { borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel={`Una ración menos de ${r.name}`}
              >
                <Ionicons name="remove" size={14} color={c.inkSoft} />
              </Pressable>
              {/* Escribible para las fracciones: los ± van de uno en uno. */}
              <ServingsInput
                value={r.servingsEaten ?? 1}
                onCommit={(n) => setServingsTo(r, n)}
                style={{ fontSize: 14 }}
                label={`Raciones de ${r.name}`}
              />
              <Pressable
                onPress={() => bumpServings(r, 1)}
                style={[styles.stepBtn, { borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel={`Una ración más de ${r.name}`}
              >
                <Ionicons name="add" size={14} color={c.inkSoft} />
              </Pressable>
              <Pressable
                onPress={() => dropRecipe(r)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${r.name}`}
              >
                <Ionicons name="close" size={16} color={c.inkSoft} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.terra} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const per = perServingMacros(item);
            return (
              <View style={[styles.row, { borderColor: c.line, backgroundColor: c.surface }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: c.chip }]} />
                )}
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
                    {Math.round(per.calories)} kcal · {Math.round(per.protein)} P/rac
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleAdd(item)}
                  disabled={busyId !== null}
                  style={[styles.addBtn, { borderColor: c.terra }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Añadir ${item.name}`}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator color={c.terra} size="small" />
                  ) : (
                    <Text style={{ color: c.terra, fontSize: 17, lineHeight: 19 }}>＋</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center', marginTop: 30 }}>
              Nada por aquí con ese filtro.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 10, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  closeBtn: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  search: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13.5 },
  list: { paddingHorizontal: 18, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    padding: 9,
    marginBottom: 8,
  },
  thumb: { width: 40, height: 40, borderRadius: 9 },
  currentBox: { paddingHorizontal: 18, paddingBottom: 8, gap: 6 },
  currentLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  stepBtn: { width: 28, height: 28, borderWidth: 1.2, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
