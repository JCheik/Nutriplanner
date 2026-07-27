import { collection } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { firestore } from '@/firebase';
import { useAuthUser } from '@/firebase/auth-context';
import { useCollection } from '@/firebase/firestore-hooks';
import { createBaseIngredients, saveUserRecipe } from '@/firebase/recipe-operations';
import { useTheme } from '@/hooks/use-theme';
import { takePendingRecipe } from '@/lib/generated-recipe-store';
import { ingredientKey, normalizeText, pluralizeUnit } from '@/lib/utils';
import type { BaseIngredient, DietTag, Ingredient, MealCategory, Recipe } from '@/lib/types';

/**
 * Revisión y guardado de una receta generada por la IA (boceto 5, versión
 * lectura). Marca qué alimentos NO están en el catálogo: al guardar se crean
 * con la estimación de la IA para que los macros cuadren al escalar la receta.
 */
export default function RecetaNuevaScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  // Se consume una sola vez al montar: si el usuario vuelve atrás y entra otra
  // vez, no hay receta pendiente y se avisa en vez de mostrar una vacía.
  const [recipe] = useState(() => takePendingRecipe());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingredientsRef = useMemo(() => collection(firestore, 'ingredients'), []);
  const { data: catalog } = useCollection<BaseIngredient>(ingredientsRef);

  // Un alimento es "nuevo" si su nombre no resuelve contra el catálogo actual.
  const catalogKeys = useMemo(() => {
    const set = new Set<string>();
    (catalog ?? []).forEach((i) => {
      set.add(ingredientKey(i.name, i.brand));
      set.add(normalizeText(i.name));
    });
    return set;
  }, [catalog]);

  const newIngredients = useMemo(
    () => (recipe?.ingredients ?? []).filter((i) => !catalogKeys.has(normalizeText(i.name))),
    [recipe, catalogKeys]
  );

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 }}>
        <Text style={{ color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
          No hay ninguna receta pendiente de revisar. Pídele otra al asistente.
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: c.terra, fontWeight: '700', fontFamily: Fonts.sans }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Primero los alimentos nuevos (si falla alguno, la receta se guarda igual).
      await createBaseIngredients(
        user.uid,
        newIngredients.map((i) => ({
          name: i.name,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
          fiber: i.fiber,
        }))
      ).catch(() => {});

      const ingredients: Ingredient[] = recipe.ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
      }));

      const toSave: Omit<Recipe, 'id'> = {
        name: recipe.name,
        description: recipe.description,
        instructions: recipe.instructions,
        ingredients,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        ...(recipe.servings ? { servings: recipe.servings } : {}),
        ...(recipe.imageHint ? { imageHint: recipe.imageHint } : {}),
        ...(recipe.dietTags?.length ? { dietTags: recipe.dietTags as DietTag[] } : {}),
        ...(recipe.category?.length ? { category: recipe.category as MealCategory[] } : {}),
      };

      await saveUserRecipe(user.uid, toSave);
      router.replace('/recetas');
    } catch {
      setError('No se pudo guardar la receta. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  };

  const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: c.terra, fontFamily: Fonts.sans, letterSpacing: 0.6 }}>
            ✦ RECETA GENERADA
          </Text>
          <Text style={{ fontSize: 21, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>{recipe.name}</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Descartar"
        >
          <Text style={{ color: c.inkSoft, fontSize: 15 }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {recipe.description ? (
          <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 19 }}>
            {recipe.description}
          </Text>
        ) : null}

        <View style={[styles.macros, { borderColor: c.line, backgroundColor: c.surface }]}>
          {[
            [`${Math.round(recipe.calories / servings)}`, 'kcal'],
            [`${Math.round(recipe.protein / servings)} g`, 'P'],
            [`${Math.round(recipe.carbs / servings)} g`, 'C'],
            [`${Math.round(recipe.fat / servings)} g`, 'G'],
          ].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>{v}</Text>
              <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{l}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, marginTop: -6 }}>
          Por ración{servings > 1 ? ` · rinde ${servings}` : ''}
        </Text>

        {newIngredients.length > 0 ? (
          <View style={[styles.notice, { borderColor: c.sage, backgroundColor: c.sageSoft }]}>
            <Text style={{ fontSize: 12.5, color: c.ink, fontFamily: Fonts.sans, fontWeight: '600' }}>
              {newIngredients.length} alimento{newIngredients.length === 1 ? '' : 's'} nuevo
              {newIngredients.length === 1 ? '' : 's'} para el catálogo
            </Text>
            <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 18 }}>
              Se crearán al guardar con la estimación de la IA ({newIngredients.map((i) => i.name).join(', ')}). Revisa
              sus macros luego en la web si quieres afinarlos.
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>INGREDIENTES</Text>
        {recipe.ingredients.map((ing) => {
          const isWeight = ['g', 'ml', ''].includes((ing.unit || '').toLowerCase());
          const qty = isWeight
            ? `${ing.quantity} ${ing.unit || 'g'}`
            : `${ing.quantity} ${pluralizeUnit(ing.unit, ing.quantity)}`;
          const isNew = newIngredients.some((n) => n.id === ing.id);
          return (
            <View key={ing.id} style={[styles.row, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Text style={{ flex: 1, fontSize: 13, color: c.ink, fontFamily: Fonts.sans }} numberOfLines={2}>
                {ing.name}
                {isNew ? <Text style={{ color: c.sage, fontSize: 11 }}> · nuevo</Text> : null}
              </Text>
              <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>{qty}</Text>
            </View>
          );
        })}

        {recipe.instructions ? (
          <>
            <Text style={[styles.sectionLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>PREPARACIÓN</Text>
            <Text style={{ fontSize: 13.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 21 }}>
              {recipe.instructions}
            </Text>
          </>
        ) : null}

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: c.terra }, saving && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Guardar en mis recetas"
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: Fonts.sans }}>
              Guardar en mis recetas
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingBottom: 10 },
  closeBtn: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 20, gap: 10 },
  macros: { flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1.5, borderRadius: Radii.card, paddingVertical: 10 },
  notice: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  footer: { paddingHorizontal: 18, paddingTop: 6 },
  saveBtn: { borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center' },
});
