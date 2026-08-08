import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { createBaseIngredients, saveGlobalRecipe, saveUserRecipe } from '@/firebase/recipe-operations';
import { useRecipes } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { DIET_TAGS, MEAL_CATEGORIES } from '@/lib/constants';
import { buildIngredientIndex, computeRecipeTotals, ingredientMacros, lookupIngredient } from '@/lib/recipe-macros';
import { normalizeText, pluralizeUnit } from '@/lib/utils';
import type { BaseIngredient, DietTag, Ingredient, MealCategory } from '@/lib/types';

/** Las cuatro casillas del alimento nuevo, en el orden de una etiqueta. */
const NEW_FOOD_FIELDS = [
  { key: 'calories', label: 'KCAL' },
  { key: 'protein', label: 'PROT' },
  { key: 'carbs', label: 'CARB' },
  { key: 'fat', label: 'GRASA' },
] as const;

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
  const { userRecipes, globalRecipes, loading: recipesLoading } = useRecipes();
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
  /** Macros por 100 g del alimento que se está creando sobre la marcha. */
  const [newFood, setNewFood] = useState({ calories: '', protein: '', carbs: '', fat: '' });

  /**
   * Relleno del formulario cuando llega la receta.
   *
   * `useRecipes` es ASÍNCRONO: en el primer render `existing` es `undefined`, y
   * `useState(existing?.name)` se queda con el valor vacío PARA SIEMPRE, porque
   * el inicial de `useState` solo se usa una vez. Por eso al editar salía todo
   * en blanco, con 0 kcal y el botón de guardar apagado. Se rellena una sola
   * vez, con la bandera, para no pisar lo que ya esté escribiendo el usuario.
   */
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !existing) return;
    hydrated.current = true;
    setName(existing.name ?? '');
    setDescription(existing.description ?? '');
    setInstructions(existing.instructions ?? '');
    setServings(existing.servings ?? 1);
    setIngredients(existing.ingredients ?? []);
    setCategories((existing.category as MealCategory[]) ?? []);
    setDiets((existing.dietTags as DietTag[]) ?? []);
  }, [existing]);

  const ingredientsRef = useMemo(() => collection(firestore, 'ingredients'), []);
  const { data: catalog } = useCollection<BaseIngredient>(ingredientsRef);
  const index = useMemo(() => buildIngredientIndex(catalog), [catalog]);

  const computed = useMemo(() => computeRecipeTotals(ingredients, index), [ingredients, index]);
  const perServing = servings > 0 ? servings : 1;
  const missing = ingredients.filter((i) => !lookupIngredient(index, i.name, i.brand));

  /**
   * Los macros solo se recalculan del catálogo cuando TODOS los ingredientes
   * resuelven contra él. Si no, se conservan los que ya tenía la receta.
   *
   * Sin esto, abrir una receta importada (cuyos ingredientes son texto libre
   * que no está en el catálogo) y darle a guardar la dejaba en 0 kcal: se
   * perdían los macros buenos por entrar a cambiarle la categoría.
   */
  const fromCatalog = ingredients.length > 0 && missing.length === 0;
  const totals =
    fromCatalog || !existing
      ? computed
      : { calories: existing.calories, protein: existing.protein, carbs: existing.carbs, fat: existing.fat };

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

  /**
   * Crea el alimento en el catálogo compartido y lo mete en la receta. El
   * catálogo es común (las rules dejan crear a cualquiera con `createdBy`), así
   * que lo que añada uno le sirve al siguiente.
   */
  const handleCreateFood = async () => {
    const name = search.trim();
    const num = (s: string) => Number(s.replace(',', '.')) || 0;
    if (!user || !name || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createBaseIngredients(user.uid, [
        {
          name,
          calories: num(newFood.calories),
          protein: num(newFood.protein),
          carbs: num(newFood.carbs),
          fat: num(newFood.fat),
          // La fibra no entra en los totales de la receta y pedir una quinta
          // casilla por algo que casi nadie va a rellenar no compensa. Queda
          // editable después desde el catálogo.
          fiber: 0,
        },
      ]);
      // Se mete ya en la receta con los macros tecleados: el catálogo en vivo
      // tarda un instante en traerlo de vuelta y la línea saldría en rojo.
      setIngredients((prev) => [
        ...prev,
        {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          quantity: 100,
          unit: 'g',
        },
      ]);
      setNewFood({ calories: '', protein: '', carbs: '', fat: '' });
      setSearch('');
    } catch {
      setError('No se pudo crear el alimento. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const setQuantity = (id: string, quantity: number) =>
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i)));

  const removeIngredient = (id: string) => setIngredients((prev) => prev.filter((i) => i.id !== id));

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  // Se pidió editar una receta concreta y todavía no ha llegado: sin esto se
  // pinta el formulario vacío y parece que la receta no tiene nada.
  const waitingForRecipe = !!recipeId && !existing && recipesLoading;

  // Editando algo que ya existe NO se exigen ingredientes: los "productos del
  // súper" se guardan sin ninguno, y con la regla vieja no había forma de
  // cambiarles la categoría desde el móvil — el botón salía siempre apagado.
  const canSave = name.trim().length > 1 && (ingredients.length > 0 || !!existing) && !busy;

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

      {waitingForRecipe ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.terra} />
        </View>
      ) : (
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

        {/* Los totales van ARRIBA de la lista, no al final: la gracia de
            montarla a mano es ver subir el número mientras añades, y al final
            de una lista de doce líneas no se ve sin hacer scroll. */}
        <View style={[styles.totals, Shadows.card, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontSize: 22, color: c.ink, fontFamily: Fonts.serif }}>
              {Math.round(totals.calories / perServing)}
            </Text>
            <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
              kcal por ración
              {perServing > 1 ? ` · ${Math.round(totals.calories)} el lote entero` : ''}
            </Text>
          </View>
          <Text style={{ fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
            {Math.round(totals.protein / perServing)} P · {Math.round(totals.carbs / perServing)} C ·{' '}
            {Math.round(totals.fat / perServing)} G
          </Text>
          {ingredients.length === 0 && !existing ? (
            <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16 }}>
              Busca alimentos abajo y ve añadiéndolos: esto se va actualizando solo.
            </Text>
          ) : null}
          {/* Decir de dónde salen los números importa: si vienen de la receta,
              tocar los ingredientes a medias no los va a mejorar. */}
          {!fromCatalog && existing ? (
            <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16 }}>
              {ingredients.length === 0
                ? 'Son los macros guardados de la receta. Se conservan tal cual al guardar.'
                : `Son los macros guardados de la receta: ${missing.length} de sus ingredientes ${missing.length === 1 ? 'no está' : 'no están'} en el catálogo, así que no puedo recalcularlos. Se conservan tal cual.`}
            </Text>
          ) : null}
          {!existing && missing.length > 0 ? (
            <Text style={{ fontSize: 11, color: c.terra, fontFamily: Fonts.sans, lineHeight: 16 }}>
              {missing.length} ingrediente{missing.length === 1 ? '' : 's'} sin datos: el total se queda corto.
            </Text>
          ) : null}
        </View>

        {ingredients.map((ing) => {
          const base = lookupIngredient(index, ing.name, ing.brand);
          const isWeight = ['g', 'ml', ''].includes((ing.unit || '').toLowerCase());
          // Lo que aporta ESTA línea: es la pregunta real al montar una receta
          // («¿cuánto me está costando el aceite?»).
          const mine = ingredientMacros(ing, index);
          return (
            <View key={ing.id} style={[styles.ingRow, { borderColor: base ? c.line : c.terra, backgroundColor: c.surface }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, color: c.ink, fontFamily: Fonts.sans }} numberOfLines={1}>
                  {ing.name}
                  {ing.brand ? <Text style={{ color: c.inkSoft }}> · {ing.brand}</Text> : null}
                </Text>
                {base ? (
                  <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                    +{Math.round(mine.calories)} kcal · {Math.round(mine.protein)} P ·{' '}
                    {Math.round(mine.carbs)} C · {Math.round(mine.fat)} G
                  </Text>
                ) : (
                  <Text style={{ fontSize: 10.5, color: c.terra, fontFamily: Fonts.sans }}>
                    No está en el catálogo: suma 0 kcal
                  </Text>
                )}
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
        {/* Si no está en el catálogo se crea aquí mismo. Antes esto decía
            "créalo desde la web", que en el móvil es un callejón sin salida:
            te quedas a mitad de receta y tienes que ir a por un ordenador. */}
        {search.trim().length >= 2 && results.length === 0 ? (
          <View style={[styles.newFood, { borderColor: c.sage, backgroundColor: c.sageSoft }]}>
            <Text style={{ fontSize: 12.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 17 }}>
              «{search.trim()}» no está en el catálogo. Créalo con sus macros{' '}
              <Text style={{ color: c.inkSoft }}>por cada 100 g</Text> y lo añado:
            </Text>
            <View style={styles.newFoodRow}>
              {NEW_FOOD_FIELDS.map((f) => (
                <View key={f.key} style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9.5, color: c.inkSoft, fontFamily: Fonts.sans, marginBottom: 2 }}>
                    {f.label}
                  </Text>
                  <TextInput
                    style={[styles.newFoodInput, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
                    keyboardType="decimal-pad"
                    value={newFood[f.key]}
                    onChangeText={(t) => setNewFood((prev) => ({ ...prev, [f.key]: t.replace(/[^\d.,]/g, '') }))}
                    editable={!busy}
                    accessibilityLabel={`${f.label} por 100 g de ${search.trim()}`}
                  />
                </View>
              ))}
            </View>
            <Pressable
              onPress={handleCreateFood}
              disabled={busy || !newFood.calories.trim()}
              style={[styles.newFoodBtn, { backgroundColor: c.sage }, (busy || !newFood.calories.trim()) && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel={`Crear ${search.trim()} y añadirlo a la receta`}
            >
              <Ionicons name="add" size={15} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 12.5, fontWeight: '700', fontFamily: Fonts.sans }}>
                Crear y añadir
              </Text>
            </Pressable>
            <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 15 }}>
              Míralo en la etiqueta del producto. Queda guardado en el catálogo, así que la próxima vez ya te sale al
              buscarlo.
            </Text>
          </View>
        ) : null}

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
      )}

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
  totals: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 11, gap: 3 },
  newFood: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
  newFoodRow: { flexDirection: 'row', gap: 6 },
  newFoodInput: {
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 13,
    textAlign: 'center',
  },
  newFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    paddingVertical: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.2, borderRadius: Radii.pill, paddingHorizontal: 11, paddingVertical: 6 },
  footer: { paddingHorizontal: 18, paddingTop: 6 },
  cta: { borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center' },
});
