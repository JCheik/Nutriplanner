import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyRecipeFilters, EMPTY_FILTERS, isRecentRecipe, RecipeFilters, type RecipeFilterState } from '@/components/recipe-filters';
import { ChefieMascot } from '@/components/chefie-mascot';
import { PaperTexture } from '@/components/paper-texture';
import { ScreenTitle } from '@/components/screen-scaffold';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useRecipes } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { perServingMacros } from '@/lib/serving-utils';
import { normalizeText } from '@/lib/utils';
import type { Recipe } from '@/lib/types';

/**
 * Biblioteca (boceto 6): Mis recetas / Recetas Nutrilp, búsqueda por nombre o
 * ingrediente y filtros de categoría/dieta/orden — mismos datos que la web.
 */
export default function RecetasScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userRecipes, globalRecipes, loading } = useRecipes();
  const [tab, setTab] = useState<'mias' | 'nutrilp'>('mias');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RecipeFilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const list = useMemo(() => {
    const source = tab === 'mias' ? userRecipes : globalRecipes;
    const q = normalizeText(search.trim());
    const searched = q
      ? source.filter(
          (r) =>
            normalizeText(r.name).includes(q) ||
            r.ingredients.some((ing) => normalizeText(ing.name).includes(q))
        )
      : source;
    return applyRecipeFilters(searched, filters);
  }, [tab, userRecipes, globalRecipes, search, filters]);

  const renderItem = ({ item }: { item: Recipe }) => {
    const per = perServingMacros(item);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/receta/[id]', params: { id: item.id, global: tab === 'nutrilp' ? '1' : '0' } })}
        style={[styles.row, { borderColor: c.line, backgroundColor: c.surface }]}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.thumb, { backgroundColor: c.chip }]} />
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }} numberOfLines={2}>
            {item.name}
            {item.brand ? <Text style={{ fontWeight: '400', color: c.inkSoft }}> · {item.brand}</Text> : null}
          </Text>
          {/* Cartel de recién llegada. Es lo que resuelve "he importado algo y no
              sé cuál de las 130 es": el aviso del móvil te da el nombre, y aquí
              se ve de un vistazo sin tener que recordarlo. */}
          {isRecentRecipe(item) && (
            <View style={[styles.nuevaBadge, { backgroundColor: c.terraSoft, borderColor: c.terra }]}>
              <Ionicons name="sparkles" size={9} color={c.terra} />
              <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.6, color: c.terra, fontFamily: Fonts.sans }}>
                NUEVA
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
            {Math.round(per.calories)} kcal · {Math.round(per.protein)} P/rac
            {item.servings && item.servings > 1 ? ` · rinde ${item.servings}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <PaperTexture />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ScreenTitle compact eyebrow="Tu biblioteca" title="Recetas" />
          </View>
          <Pressable
            onPress={() => router.push('/receta-crear')}
            style={[styles.newRecipeBtn, Shadows.card, { backgroundColor: c.terra }]}
            accessibilityRole="button"
            accessibilityLabel="Crear una receta nueva"
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 12.5, fontWeight: '700', fontFamily: Fonts.sans }}>
              Nueva receta
            </Text>
          </Pressable>
        </View>
        <View style={[styles.segment, { borderColor: c.line, backgroundColor: c.surface }]}>
          {(['mias', 'nutrilp'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.segmentItem, tab === t && { backgroundColor: c.terra }]}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: tab === t ? '700' : '400',
                  color: tab === t ? '#FFF' : c.inkSoft,
                  fontFamily: Fonts.sans,
                }}
              >
                {t === 'mias' ? 'Mis recetas' : 'Recetas Nutrilp'}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[
            styles.search,
            { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans },
          ]}
          placeholder="Buscar por nombre o ingrediente…"
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
        {/* Solo queda el producto del súper: importar de un enlace y escribirla
            a mano ya son dos de los tres caminos de "Nueva receta", y repetirlos
            aquí en letra pequeña era justo lo que hacía que no se vieran. */}
        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => router.push('/productos')}
            style={styles.productLink}
            accessibilityRole="button"
            accessibilityLabel="Añadir un producto del súper"
          >
            <Ionicons name="cart-outline" size={13} color={c.inkSoft} />
            <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>Producto del súper</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.terra} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 20 }}>
              {/* Encogido de hombros si la búsqueda no da nada; bandeja si aún
                  no hay recetas, que es una invitación, no un error. */}
              <ChefieMascot pose={search ? 'shrug' : 'serve'} size={86} />
              <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center', lineHeight: 19 }}>
                {search
                  ? 'Nada por aquí con ese filtro.'
                  : tab === 'mias'
                    ? 'Aún no tienes recetas propias. Dale a "Nueva receta" y te monto una con lo que me digas.'
                    : 'No se pudieron cargar las recetas de Nutrilp.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nuevaBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 1,
  },
  header: { paddingHorizontal: 18, paddingBottom: 10, gap: 10 },
  newRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radii.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  productLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 1 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: Radii.card,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  segmentItem: { paddingHorizontal: 13, paddingVertical: 7 },
  search: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  list: { paddingHorizontal: 18, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    padding: 9,
    marginBottom: 8,
  },
  thumb: { width: 44, height: 44, borderRadius: 9 },
});
