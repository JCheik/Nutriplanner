import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { saveUserRecipe } from '@/firebase/recipe-operations';
import { useTheme } from '@/hooks/use-theme';
import { searchOffProducts, type OffProduct } from '@/lib/open-food-facts';
import type { Recipe } from '@/lib/types';

/**
 * Añadir un producto del súper buscándolo por nombre en Open Food Facts. Se
 * guarda como "producto" = receta de 1 ración (misma convención que la web),
 * así se puede planificar y marcar como comido igual que cualquier receta.
 */
export default function ProductosScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OffProduct[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<OffProduct | null>(null);
  const [grams, setGrams] = useState('100');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La búsqueda solo se dispara al enviar, nunca por tecla: Open Food Facts
  // limita las peticiones.
  const runSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchOffProducts(q));
    } catch {
      setError('El buscador no responde ahora mismo. Inténtalo de nuevo en un momento.');
    } finally {
      setSearching(false);
    }
  };

  const gramsNum = Number(grams);
  const scale = Number.isFinite(gramsNum) && gramsNum > 0 ? gramsNum / 100 : 1;

  const handleSave = async () => {
    if (!user || !picked || saving) return;
    setSaving(true);
    setError(null);
    try {
      const recipe: Omit<Recipe, 'id'> = {
        name: picked.name,
        ...(picked.brand ? { brand: picked.brand } : {}),
        description: `Producto · ración de ${Math.round(gramsNum)} g`,
        instructions: '',
        ingredients: [],
        servings: 1,
        category: ['snack'],
        dietTags: [],
        calories: Math.round(picked.per100g.calories * scale),
        protein: Math.round(picked.per100g.protein * scale * 10) / 10,
        carbs: Math.round(picked.per100g.carbs * scale * 10) / 10,
        fat: Math.round(picked.per100g.fat * scale * 10) / 10,
        ...(picked.imageUrl ? { imageUrl: picked.imageUrl } : {}),
      };
      await saveUserRecipe(user.uid, recipe);
      router.replace('/recetas');
    } catch {
      setError('No se pudo guardar el producto. Inténtalo de nuevo.');
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 21, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
            Añadir producto
          </Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Un yogur, una barrita, una bebida…
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={17} color={c.inkSoft} />
        </Pressable>
      </View>

      {!picked ? (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1, borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              placeholder="ej. yogur griego, avena…"
              placeholderTextColor={c.inkSoft}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel="Buscar producto"
            />
            <Pressable
              onPress={runSearch}
              disabled={!query.trim() || searching}
              style={[styles.searchBtn, { backgroundColor: c.terra }, (!query.trim() || searching) && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Buscar"
            >
              {searching ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="search" size={18} color="#FFF" />}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
            {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}
            {results === null ? (
              <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center', marginTop: 24, lineHeight: 19 }}>
                Busca un producto por su nombre. Los datos vienen de Open Food Facts, una base de datos abierta.
              </Text>
            ) : results.length === 0 ? (
              <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center', marginTop: 24 }}>
                Sin resultados con datos nutricionales. Prueba con otro nombre.
              </Text>
            ) : (
              results.map((p, i) => (
                <Pressable
                  key={p.barcode ?? `${p.name}-${i}`}
                  onPress={() => setPicked(p)}
                  style={[styles.row, { borderColor: c.line, backgroundColor: c.surface }]}
                  accessibilityRole="button"
                  accessibilityLabel={p.name}
                >
                  {p.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: c.chip }]} />
                  )}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }} numberOfLines={2}>
                      {p.name}
                    </Text>
                    {p.brand ? (
                      <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }} numberOfLines={1}>
                        {p.brand}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                    {Math.round(p.per100g.calories)} kcal/100g
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.card, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>{picked.name}</Text>
            {picked.brand ? (
              <Text style={{ fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{picked.brand}</Text>
            ) : null}
            <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, marginTop: 4 }}>
              Por 100 g: {Math.round(picked.per100g.calories)} kcal · {picked.per100g.protein} P ·{' '}
              {picked.per100g.carbs} C · {picked.per100g.fat} G
            </Text>
          </View>

          <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>TU RACIÓN (g)</Text>
          <TextInput
            style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
            value={grams}
            onChangeText={setGrams}
            keyboardType="numeric"
            accessibilityLabel="Gramos por ración"
          />

          <View style={[styles.card, { borderColor: c.line, backgroundColor: c.surface, flexDirection: 'row', justifyContent: 'space-around' }]}>
            {[
              [`${Math.round(picked.per100g.calories * scale)}`, 'kcal'],
              [`${Math.round(picked.per100g.protein * scale)} g`, 'P'],
              [`${Math.round(picked.per100g.carbs * scale)} g`, 'C'],
              [`${Math.round(picked.per100g.fat * scale)} g`, 'G'],
            ].map(([v, l]) => (
              <View key={l} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>{v}</Text>
                <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{l}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 17 }}>
            Se guarda como producto de 1 ración: podrás ponerlo en el plan y marcarlo como comido igual que una receta.
          </Text>

          {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.primaryBtn, { backgroundColor: c.terra }, saving && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Guardar producto"
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: Fonts.sans }}>
                Guardar producto
              </Text>
            )}
          </Pressable>
          <Pressable onPress={() => setPicked(null)} style={styles.secondaryBtn} accessibilityRole="button">
            <Text style={{ color: c.inkSoft, fontSize: 13, fontFamily: Fonts.sans }}>Buscar otro</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingBottom: 10 },
  iconBtn: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 8 },
  searchBtn: { width: 46, borderRadius: Radii.card, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, gap: 8 },
  input: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  label: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    padding: 9,
  },
  thumb: { width: 42, height: 42, borderRadius: 9 },
  card: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 11 },
  primaryBtn: { borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 8 },
});
