import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaperTexture } from '@/components/paper-texture';
import { ScreenTitle } from '@/components/screen-scaffold';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { firestore } from '@/firebase';
import { useAuthUser } from '@/firebase/auth-context';
import { useCollection } from '@/firebase/firestore-hooks';
import { saveGlobalRecipe, saveUserRecipe } from '@/firebase/recipe-operations';
import { useRecipes } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { DIET_TAGS, MEAL_CATEGORIES } from '@/lib/constants';
import { buildIngredientIndex, computeRecipeTotals, lookupIngredient } from '@/lib/recipe-macros';
import { normalizeText, pluralizeUnit } from '@/lib/utils';
import type { BaseIngredient, DietTag, Ingredient, MealCategory } from '@/lib/types';

/**
 * Editor manual de recetas. Hasta ahora, crear una receta a mano era lo único
 * que seguía siendo exclusivo de la web: en la app solo se podía pedírsela a la
 * IA (`/receta-crear`) o importarla de un enlace.
 *
 * Los macros NO se teclean: salen del catálogo compartido, igual que en la web
 * (`recipe-macros.ts`). Lo que se guarda son los totales del LOTE, y la UI de
 * toda la app los divide entre las raciones con `perServingMacros`.
 */
export default function RecetaEditarScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  const { recipeId, global } = useLocalSearchParams<{ recipeId?: string; global?: string }>();
  const { userRecipes, globalRecipes } = useRecipes();
  // Editando una del recetario de Nutrilp: se guarda ahí, no en las tuyas.
  const isGlobal = global === '1';

  const existing = useMemo(
    () => (isGlobal ? globalRecipes : userRecipes).find((r) => r.id === recipeId),
    [isGlobal, globalRecipes, userRecipes, recipeId]
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [servings, setServings] = useState(existing?.servings ?? 1);
  const [ingredients, setIngredients] = useState<Ingredient[]>(existing?.ingredients ?? []);
  const [categories, setCategories] = useState<MealCategory[]>((existing?.category as MealCategory[]) ?? []);
  const [diets, setDiets] = useState<DietTag[]>((existing?.dietTags as DietTag[]) ?? []);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingredientsRef = useMemo(() => collection(firestore, 'ingredients'), []);
  const { data: catalog } = useCollection<BaseIngredient>(ingredientsRef);
  const index = useMemo(() => buildIngredientIndex(catalog), [catalog]);

  const totals = useMemo(() => computeRecipeTotals(ingredients, index), [ingredients, index]);
  const perServing = servings > 0 ? servings : 1;
  const missing = ingredients.filter((i) => !lookupIngredient(index, i.name, i.brand));

  const results = useMemo(() => {
    const q = normalizeText(search.trim());
    if (q.length < 2) return [];
    return (catalog ?? [])
      .filter((i) => normalizeText(i.name).includes(q))
      .slice(0, 8);
  }, [search, catalog]);

  const addIngredient = (base: BaseIngredient) => {
    setIngredients((prev) => [
      ...prev,
      {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: base.name,
        ...(base.brand ? { brand: base.brand } : {}),
        // Por defecto 100 g, o 1 pieza si el alimento se mide por unidades.
        quantity: base.unitName ? 1 : 100,
        unit: base.unitName ?? 'g',
        ...(base.unitName && base.unitWeight ? { unitWeight: base.unitWeight } : {}),
      },
    ]);
    setSearch('');
  };

  const setQuantity = (id: string, quantity: number) =>
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i)));

  const removeIngredient = (id: string) => setIngredients((prev) => prev.filter((i) => i.id !== id));

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const canSave = name.trim().length > 1 && ingredients.length > 0 && !busy;

  const handleSave = async () => {
    if (!canSave || !user) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        ingredients,
        // Totales del lote: la app entera asume esta convención.
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        servings: perServing,
        ...(categories.length ? { category: categories } : {}),
        ...(diets.length ? { dietTags: diets } : {}),
      };
      // Con `recipeId` se ACTUALIZA; sin él se crea. Antes no se pasaba nunca y
      // editar acababa dejando una receta duplicada.
      await (isGlobal
        ? saveGlobalRecipe(payload, recipeId)
        : saveUserRecipe(user.uid, payload, recipeId));
      router.replace('/recetas');
    } catch {
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}
    >
      <PaperTexture />
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ScreenTitle compact eyebrow="A mano" title={existing ? 'Editar receta' : 'Nueva receta'} />
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

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
          placeholder="Nombre de la receta"
          placeholderTextColor={c.inkSoft}
          value={name}
          onChangeText={setName}
          editable={!busy}
        />
        <TextInput
          style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
          placeholder="Descripción corta (opcional)"
          placeholderTextColor={c.inkSoft}
          value={description}
          onChangeText={setDescription}
          editable={!busy}
        />

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>RACIONES QUE SALEN</Text>
        <View style={[styles.servingsRow, { borderColor: c.line, backgroundColor: c.surface }]}>
          <Pressable
            onPress={() => setServings((s) => Math.max(1, s - 1))}
            style={[styles.stepBtn, { borderColor: c.line }]}
            accessibilityRole="button"
            accessibilityLabel="Una ración menos"
          >
            <Ionicons name="remove" size={16} color={c.inkSoft} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 19, color: c.ink, fontFamily: Fonts.serif }}>
            {servings}
          </Text>
          <Pressable
            onPress={() => setServings((s) => s + 1)}
            style={[styles.stepBtn, { borderColor: c.line }]}
            accessibilityRole="button"
            accessibilityLabel="Una ración más"
          >
            <Ionicons name="add" size={16} color={c.inkSoft} />
          </Pressable>
        </View>

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>INGREDIENTES</Text>
        {ingredients.map((ing) => {
          const base = lookupIngredient(index, ing.name, ing.brand);
          const isWeight = ['g', 'ml', ''].includes((ing.unit || '').toLowerCase());
          return (
            <View key={ing.id} style={[styles.ingRow, { borderColor: base ? c.line : c.terra, backgroundColor: c.surface }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, color: c.ink, fontFamily: Fonts.sans }} numberOfLines={1}>
                  {ing.name}
                  {ing.brand ? <Text style={{ color: c.inkSoft }}> · {ing.brand}</Text> : null}
                </Text>
                {!base ? (
                  <Text style={{ fontSize: 10.5, color: c.terra, fontFamily: Fonts.sans }}>
                    No está en el catálogo: suma 0 kcal
                  </Text>
                ) : null}
              </View>
              <TextInput
                style={[styles.qtyInput, { borderColor: c.line, color: c.ink, fontFamily: Fonts.sans }]}
                keyboardType="numeric"
                value={String(ing.quantity)}
                onChangeText={(t) => setQuantity(ing.id, Number(t.replace(/[^\d.]/g, '')) || 0)}
                editable={!busy}
              />
              <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, width: 46 }} numberOfLines={1}>
                {isWeight ? ing.unit || 'g' : pluralizeUnit(ing.unit, ing.quantity)}
              </Text>
              <Pressable onPress={() => removeIngredient(ing.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Quitar ${ing.name}`}>
                <Ionicons name="close" size={16} color={c.inkSoft} />
              </Pressable>
            </View>
          );
        })}

        <TextInput
          style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
          placeholder="Buscar alimento para añadir…"
          placeholderTextColor={c.inkSoft}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          editable={!busy}
        />
        {results.map((base) => (
          <Pressable
            key={base.id}
            onPress={() => addIngredient(base)}
            style={[styles.result, { borderColor: c.line, backgroundColor: c.surface }]}
            accessibilityRole="button"
            accessibilityLabel={`Añadir ${base.name}`}
          >
            <Ionicons name="add-circle-outline" size={15} color={c.sage} />
            <Text style={{ flex: 1, fontSize: 12.5, color: c.ink, fontFamily: Fonts.sans }} numberOfLines={1}>
              {base.name}
              {base.brand ? <Text style={{ color: c.inkSoft }}> · {base.brand}</Text> : null}
            </Text>
            <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>
              {Math.round(base.calories)} kcal/100
            </Text>
          </Pressable>
        ))}
        {search.trim().length >= 2 && results.length === 0 ? (
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Ese alimento no está en el catálogo. Créalo primero desde la web, o busca otro nombre.
          </Text>
        ) : null}

        {/* Totales en vivo: se calculan del catálogo, no se teclean. */}
        <View style={[styles.totals, Shadows.card, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
          <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>POR RACIÓN</Text>
          <Text style={{ fontSize: 15, color: c.ink, fontFamily: Fonts.serif }}>
            {Math.round(totals.calories / perServing)} kcal
            <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
              {'  ·  '}
              {Math.round(totals.protein / perServing)} P · {Math.round(totals.carbs / perServing)} C ·{' '}
              {Math.round(totals.fat / perServing)} G
            </Text>
          </Text>
          {missing.length > 0 ? (
            <Text style={{ fontSize: 11, color: c.terra, fontFamily: Fonts.sans }}>
              {missing.length} ingrediente{missing.length === 1 ? '' : 's'} sin datos: el total se queda corto.
            </Text>
          ) : null}
        </View>

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>PREPARACIÓN</Text>
        <TextInput
          style={[
            styles.input,
            styles.multiline,
            { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans },
          ]}
          placeholder="Paso a paso (opcional). Si escribes los minutos, el modo cocina los detecta."
          placeholderTextColor={c.inkSoft}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          textAlignVertical="top"
          editable={!busy}
        />

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>PARA QUÉ COMIDA</Text>
        <View style={styles.chips}>
          {MEAL_CATEGORIES.map((cat) => {
            const on = categories.includes(cat.value as MealCategory);
            return (
              <Pressable
                key={cat.value}
                onPress={() => toggle(categories, cat.value as MealCategory, setCategories)}
                style={[styles.chip, { borderColor: on ? c.terra : c.line, backgroundColor: on ? c.terraSoft : c.surface }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={cat.label}
              >
                <Text style={{ fontSize: 12, color: on ? c.terra : c.inkSoft, fontFamily: Fonts.sans }}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>DIETA</Text>
        <View style={styles.chips}>
          {DIET_TAGS.map((d) => {
            const on = diets.includes(d.value as DietTag);
            return (
              <Pressable
                key={d.value}
                onPress={() => toggle(diets, d.value as DietTag, setDiets)}
                style={[styles.chip, { borderColor: on ? c.sage : c.line, backgroundColor: on ? c.sageSoft : c.surface }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={d.label}
              >
                <Text style={{ fontSize: 12, color: on ? c.sage : c.inkSoft, fontFamily: Fonts.sans }}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.cta, Shadows.card, { backgroundColor: c.terra }, !canSave && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Guardar receta"
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans }}>
              Guardar receta
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingBottom: 10 },
  closeBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 20, gap: 8 },
  miniLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginTop: 8 },
  input: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  multiline: { minHeight: 110 },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepBtn: { width: 32, height: 32, borderWidth: 1.2, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  qtyInput: { width: 58, borderWidth: 1.2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 13, textAlign: 'right' },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  totals: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10, gap: 2, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.2, borderRadius: Radii.pill, paddingHorizontal: 11, paddingVertical: 6 },
  footer: { paddingHorizontal: 18, paddingTop: 6 },
  cta: { borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center' },
});
