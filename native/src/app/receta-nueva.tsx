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
 * Cantidad reescalada, redondeada a algo que se pueda leer: entera a partir de
 * 10 (los gramos no necesitan decimales) y con uno por debajo, para que media
 * cebolla no acabe siendo "0.4999999".
 */
function scaleQty(quantity: number, factor: number): number {
  const scaled = quantity * factor;
  if (scaled >= 10) return Math.round(scaled);
  return Math.round(scaled * 10) / 10;
}

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
  /**
   * Raciones que rinde, editables ANTES de guardar. Era de solo lectura: si la
   * IA decía 1 donde eran 8 (los pies de Instagram casi nunca lo dicen), todos
   * los macros salían ocho veces más altos y no había forma de arreglarlo.
   * `null` = todavía no tocado, se usa lo que trajo la IA.
   */
  const [servingsOverride, setServingsOverride] = useState<number | null>(null);
  /** Al pasar a 1 ración se reescalan también las cantidades del lote. */
  const [scaledToOne, setScaledToOne] = useState(false);

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

  // Raciones que la IA dedujo, y las que el usuario dice que son de verdad.
  const aiServings = recipe?.servings && recipe.servings > 0 ? recipe.servings : 1;
  const declaredServings = servingsOverride ?? aiServings;
  // Al pasar a 1 ración se divide el lote entero; si no, se guarda tal cual.
  const factor = scaledToOne ? 1 / declaredServings : 1;
  const savedServings = scaledToOne ? 1 : declaredServings;

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
        quantity: scaleQty(i.quantity, factor),
        unit: i.unit,
      }));

      const toSave: Omit<Recipe, 'id'> = {
        name: recipe.name,
        description: recipe.description,
        instructions: recipe.instructions,
        ingredients,
        calories: Math.round(recipe.calories * factor),
        protein: Math.round(recipe.protein * factor),
        carbs: Math.round(recipe.carbs * factor),
        fat: Math.round(recipe.fat * factor),
        servings: savedServings,
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

  // Lo que se enseña siempre es UNA ración, como en el resto de la app.
  const perServing = {
    calories: (recipe.calories * factor) / savedServings,
    protein: (recipe.protein * factor) / savedServings,
    carbs: (recipe.carbs * factor) / savedServings,
    fat: (recipe.fat * factor) / savedServings,
  };

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
            [`${Math.round(perServing.calories)}`, 'kcal'],
            [`${Math.round(perServing.protein)} g`, 'P'],
            [`${Math.round(perServing.carbs)} g`, 'C'],
            [`${Math.round(perServing.fat)} g`, 'G'],
          ].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>{v}</Text>
              <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{l}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, marginTop: -6 }}>
          Por ración{savedServings > 1 ? ` · rinde ${savedServings}` : ''}
        </Text>

        {/* Cuántas raciones rinde. Editable porque la IA se equivoca: los pies
            de Instagram casi nunca lo dicen y lo tiene que adivinar, y si falla
            todos los macros de arriba salen mal por ese mismo factor. */}
        <View style={[styles.servingsBox, { borderColor: c.line, backgroundColor: c.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }}>
                ¿Para cuántas raciones es?
              </Text>
              <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16 }}>
                {scaledToOne
                  ? 'Cantidades ajustadas a una sola ración.'
                  : 'Si no cuadra, cámbialo: los macros de arriba se recalculan.'}
              </Text>
            </View>
            {!scaledToOne ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  // Forma funcional: con el valor capturado del render, tocar
                  // rápido varias veces solo restaba una.
                  onPress={() => setServingsOverride((prev) => Math.max(1, (prev ?? aiServings) - 1))}
                  style={[styles.roundBtn, { borderColor: c.line }]}
                  accessibilityRole="button"
                  accessibilityLabel="Una ración menos"
                >
                  <Text style={{ color: c.inkSoft, fontSize: 16 }}>−</Text>
                </Pressable>
                <Text style={{ minWidth: 18, textAlign: 'center', fontSize: 15, color: c.ink, fontFamily: Fonts.serif }}>
                  {declaredServings}
                </Text>
                <Pressable
                  onPress={() => setServingsOverride((prev) => Math.min(20, (prev ?? aiServings) + 1))}
                  style={[styles.roundBtn, { borderColor: c.line }]}
                  accessibilityRole="button"
                  accessibilityLabel="Una ración más"
                >
                  <Text style={{ color: c.inkSoft, fontSize: 16 }}>+</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Atajo para quien cocina solo para sí: divide el lote entero. */}
          {declaredServings > 1 || scaledToOne ? (
            <Pressable
              onPress={() => setScaledToOne((s) => !s)}
              style={[styles.scaleBtn, { borderColor: scaledToOne ? c.terra : c.line }]}
              accessibilityRole="button"
              accessibilityState={{ selected: scaledToOne }}
              accessibilityLabel={scaledToOne ? 'Dejarla como el lote original' : 'Pasarla a una sola ración'}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: scaledToOne ? c.terra : c.inkSoft,
                  fontFamily: Fonts.sans,
                }}
              >
                {scaledToOne ? '↺ Dejarla como el lote original' : 'Pasarla a 1 ración'}
              </Text>
            </Pressable>
          ) : null}
        </View>

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
          // Se enseña ya reescalado, para que lo que ves sea lo que se guarda.
          const q = scaleQty(ing.quantity, factor);
          const qty = isWeight ? `${q} ${ing.unit || 'g'}` : `${q} ${pluralizeUnit(ing.unit, q)}`;
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
  servingsBox: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  roundBtn: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  scaleBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
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
