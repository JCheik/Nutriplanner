import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyRecipeFilters, EMPTY_FILTERS, RecipeFilters, type RecipeFilterState } from '@/components/recipe-filters';
import { Fonts, Radii } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { addRecipeToMeal } from '@/firebase/plan-operations';
import { useRecipes } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { perServingMacros } from '@/lib/serving-utils';
import { normalizeText } from '@/lib/utils';
import type { MealCategory, Recipe } from '@/lib/types';

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
  addBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
