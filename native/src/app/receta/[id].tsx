import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { useRecipes } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { perServingMacros } from '@/lib/serving-utils';
import { pluralizeUnit } from '@/lib/utils';

/** Vista de receta (solo lectura en F1) — macros por ración, ingredientes y pasos. */
export default function RecetaDetailScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, global } = useLocalSearchParams<{ id: string; global?: string }>();
  const { userRecipes, globalRecipes } = useRecipes();

  const recipe =
    (global === '1' ? globalRecipes : userRecipes).find((r) => r.id === id) ??
    [...userRecipes, ...globalRecipes].find((r) => r.id === id);

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
          No se encontró la receta (puede que se haya borrado).
        </Text>
      </View>
    );
  }

  const per = perServingMacros(recipe);

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
              {recipe.name}
            </Text>
            {recipe.brand ? (
              <Text style={{ fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{recipe.brand}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { borderColor: c.line }]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Text style={{ color: c.inkSoft, fontSize: 15 }}>✕</Text>
          </Pressable>
        </View>

        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} style={styles.photo} contentFit="cover" transition={200} />
        ) : null}

        {recipe.description ? (
          <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 19 }}>
            {recipe.description}
          </Text>
        ) : null}

        <View style={[styles.macros, { borderColor: c.line, backgroundColor: c.surface }]}>
          {[
            [`${Math.round(per.calories)}`, 'kcal'],
            [`${Math.round(per.protein)} g`, 'P'],
            [`${Math.round(per.carbs)} g`, 'C'],
            [`${Math.round(per.fat)} g`, 'G'],
          ].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>{v}</Text>
              <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{l}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, marginTop: -6 }}>
          Por ración{per.servings > 1 ? ` · la receta rinde ${per.servings}` : ''}
        </Text>

        <Text style={[styles.sectionLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>INGREDIENTES</Text>
        <View style={{ gap: 6 }}>
          {recipe.ingredients.map((ing) => {
            const isWeight = ['g', 'ml', ''].includes((ing.unit || '').toLowerCase());
            const qty = isWeight ? `${ing.quantity} ${ing.unit || 'g'}` : `${ing.quantity} ${pluralizeUnit(ing.unit, ing.quantity)}`;
            return (
              <View key={ing.id} style={[styles.ingredientRow, { borderColor: c.line, backgroundColor: c.surface }]}>
                <Text style={{ flex: 1, fontSize: 13, color: c.ink, fontFamily: Fonts.sans }} numberOfLines={2}>
                  {ing.name}
                  {ing.brand ? <Text style={{ color: c.inkSoft }}> · {ing.brand}</Text> : null}
                </Text>
                <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>{qty}</Text>
              </View>
            );
          })}
        </View>

        {recipe.instructions ? (
          <>
            <Pressable
              onPress={() => router.push({ pathname: '/cocina/[id]', params: { id: recipe.id } })}
              style={[styles.cookBtn, { backgroundColor: c.terra }]}
              accessibilityRole="button"
              accessibilityLabel="Empezar modo cocina"
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
                👨‍🍳 Modo cocina
              </Text>
            </Pressable>
            <Text style={[styles.sectionLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>PREPARACIÓN</Text>
            <Text style={{ fontSize: 13.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 21 }}>
              {recipe.instructions}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  closeBtn: {
    width: 30,
    height: 30,
    borderWidth: 1.5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: 170, borderRadius: Radii.card },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingVertical: 10,
  },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  cookBtn: { borderRadius: Radii.card, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
});
