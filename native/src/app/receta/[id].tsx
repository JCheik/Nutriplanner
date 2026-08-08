import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { deleteGlobalRecipe, deleteUserRecipe } from '@/firebase/recipe-operations';
import { useRecipes } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { perServingMacros } from '@/lib/serving-utils';
import { pluralizeUnit } from '@/lib/utils';

/** Vista de receta: macros por ración, ingredientes, pasos y acciones. */
export default function RecetaDetailScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAdmin } = useAuthUser();
  const { id, global } = useLocalSearchParams<{ id: string; global?: string }>();
  const { userRecipes, globalRecipes } = useRecipes();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipe =
    (global === '1' ? globalRecipes : userRecipes).find((r) => r.id === id) ??
    [...userRecipes, ...globalRecipes].find((r) => r.id === id);

  // Las propias siempre; las del recetario de Nutrilp solo si administras, que
  // es lo que dicen las rules. Antes había que entrar por la web para tocarlas.
  const isOwn = !!recipe && userRecipes.some((r) => r.id === recipe.id);
  const isGlobal = !!recipe && !isOwn;
  const canEdit = isOwn || (isGlobal && isAdmin);

  const handleDelete = async () => {
    if (!user || !recipe || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await (isGlobal ? deleteGlobalRecipe(recipe.id) : deleteUserRecipe(user.uid, recipe.id));
      router.replace('/recetas');
    } catch {
      setError('No se pudo borrar. Revisa tu conexión e inténtalo de nuevo.');
      setDeleting(false);
    }
  };

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

        {/* Acción principal de esta pantalla: llevártela al plan. Antes había que
            salir a Plan, buscar la franja y volver a buscar la receta. */}
        <Pressable
          onPress={() =>
            router.push({ pathname: '/plan-anadir', params: { recipeId: recipe.id, global: global ?? '0' } })
          }
          style={[styles.cookBtn, Shadows.card, { backgroundColor: c.terra }]}
          accessibilityRole="button"
          accessibilityLabel="Añadir esta receta al plan"
        >
          <Ionicons name="calendar-outline" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
            Añadir al plan
          </Text>
        </Pressable>

        {recipe.instructions ? (
          <>
            <Pressable
              onPress={() => router.push({ pathname: '/cocina/[id]', params: { id: recipe.id } })}
              style={[styles.cookBtn, { borderWidth: 1.5, borderColor: c.line }]}
              accessibilityRole="button"
              accessibilityLabel="Empezar modo cocina"
            >
              <Ionicons name="restaurant-outline" size={16} color={c.inkSoft} />
              <Text style={{ color: c.inkSoft, fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
                Modo cocina
              </Text>
            </Pressable>
            <Text style={[styles.sectionLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>PREPARACIÓN</Text>
            <Text style={{ fontSize: 13.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 21 }}>
              {recipe.instructions}
            </Text>
          </>
        ) : null}

        {/* Editar y borrar: las tuyas siempre, las de Nutrilp si administras. */}
        {canEdit ? (
          confirmDelete ? (
            <View style={[styles.confirmBox, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
              <Text style={{ fontSize: 13, color: c.ink, fontFamily: Fonts.sans, lineHeight: 19 }}>
                ¿Borrar &quot;{recipe.name}&quot;? No se puede deshacer. Lo que ya tengas puesto en el plan se queda
                como está.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={handleDelete}
                  disabled={deleting}
                  style={[styles.smallBtn, { backgroundColor: c.terra }, deleting && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Sí, borrar la receta"
                >
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans }}>
                    {deleting ? 'Borrando…' : 'Sí, borrar'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmDelete(false)}
                  disabled={deleting}
                  style={[styles.smallBtn, { borderWidth: 1.5, borderColor: c.line }]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                >
                  <Text style={{ color: c.inkSoft, fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans }}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.ownActions}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/receta-editar',
                    params: { recipeId: recipe.id, global: isGlobal ? '1' : '0' },
                  })
                }
                style={[styles.smallBtn, styles.ownBtn, { borderWidth: 1.5, borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel="Editar receta"
              >
                <Ionicons name="create-outline" size={15} color={c.inkSoft} />
                <Text style={{ color: c.inkSoft, fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans }}>
                  Editar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirmDelete(true)}
                style={[styles.smallBtn, styles.ownBtn, { borderWidth: 1.5, borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel="Borrar receta"
              >
                <Ionicons name="trash-outline" size={15} color={c.terra} />
                <Text style={{ color: c.terra, fontSize: 13, fontWeight: '700', fontFamily: Fonts.sans }}>Borrar</Text>
              </Pressable>
            </View>
          )
        ) : null}

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}
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
  cookBtn: {
    flexDirection: 'row',
    gap: 7,
    borderRadius: Radii.card,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ownActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ownBtn: { flex: 1 },
  smallBtn: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: Radii.card,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBox: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 10,
    marginTop: 12,
  },
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
