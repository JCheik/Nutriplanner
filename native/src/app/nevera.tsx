import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { parseFridgeImage, type FridgeRecipe, type FridgeScanResult } from '@/firebase/ai-client';
import { useAuthUser } from '@/firebase/auth-context';
import { saveUserRecipe } from '@/firebase/recipe-operations';
import { useProfile } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import type { DietTag, MealCategory, Recipe } from '@/lib/types';

/**
 * Escanear la nevera: foto → la IA lista lo que ve y propone recetas con eso.
 * Es la función más alineada con el norte del producto (no tirar comida):
 * cocinar con lo que YA tienes en vez de comprar de más.
 */
export default function NeveraScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  const { activeGoalMacros } = useProfile();
  const { shared } = useLocalSearchParams<{ shared?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  // Evita reanalizar la imagen compartida en cada render.
  const startedRef = useRef(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FridgeScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());

  const analyze = useCallback(
    async (imageBase64: string) => {
      setAnalyzing(true);
      setError(null);
      try {
        const scan = await parseFridgeImage({ imageBase64, nutritionalGoal: activeGoalMacros });
        setResult(scan);
      } catch (e) {
        setError(
          e instanceof Error && e.message !== 'sin imagen'
            ? e.message
            : 'No se pudo analizar la foto. Inténtalo de nuevo.'
        );
      } finally {
        setAnalyzing(false);
      }
    },
    [activeGoalMacros]
  );

  const handleCapture = async () => {
    if (analyzing || !cameraRef.current) return;
    try {
      // Calidad baja a propósito: la IA no necesita más y el envío es mucho
      // más rápido con datos móviles.
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (!photo?.base64) throw new Error('sin imagen');
      await analyze(`data:image/jpeg;base64,${photo.base64}`);
    } catch {
      setError('No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  /**
   * Foto que llega de "Compartir" desde otra app (galería, WhatsApp…). Se salta
   * la cámara y analiza directamente. La URI se convierte a base64 con
   * fetch+FileReader porque el endpoint espera un data URL, igual que la cámara.
   */
  useEffect(() => {
    if (!shared || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const res = await fetch(shared);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('no se pudo leer la imagen'));
          reader.readAsDataURL(blob);
        });
        await analyze(dataUrl);
      } catch {
        setError('No he podido abrir esa imagen. Prueba a hacerle la foto desde aquí.');
      }
    })();
  }, [shared, analyze]);

  const handleSaveRecipe = async (recipe: FridgeRecipe, index: number) => {
    if (!user || savingIdx !== null) return;
    setSavingIdx(index);
    setError(null);
    try {
      const toSave: Omit<Recipe, 'id'> = {
        name: recipe.name,
        description: recipe.description,
        instructions: recipe.instructions,
        ingredients: recipe.ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          ...(i.brand ? { brand: i.brand } : {}),
          quantity: i.quantity,
          unit: i.unit,
        })),
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        ...(recipe.servings ? { servings: recipe.servings } : {}),
        ...(recipe.category?.length ? { category: recipe.category as MealCategory[] } : {}),
        ...(recipe.dietTags?.length ? { dietTags: recipe.dietTags as DietTag[] } : {}),
      };
      await saveUserRecipe(user.uid, toSave);
      setSavedIdx((prev) => new Set(prev).add(index));
    } catch {
      setError('No se pudo guardar la receta. Inténtalo de nuevo.');
    } finally {
      setSavingIdx(null);
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 21, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
          Foto de mi nevera
        </Text>
        <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
          Cocina con lo que ya tienes
        </Text>
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
  );

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 }}>
          <Text style={{ fontSize: 13.5, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center', lineHeight: 20 }}>
            Necesito la cámara para ver qué tienes en la nevera y proponerte recetas con ello.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={[styles.primaryBtn, { backgroundColor: c.terra }]}
            accessibilityRole="button"
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
              Permitir cámara
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      {header}

      {!result ? (
        <>
          <View style={styles.cameraWrap}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />
            {analyzing ? (
              <View style={styles.analyzing}>
                <ActivityIndicator color="#FFF" size="large" />
                <Text style={{ color: '#FFF', fontFamily: Fonts.sans, fontSize: 13 }}>Mirando qué tienes…</Text>
              </View>
            ) : null}
          </View>
          {error ? (
            <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans, textAlign: 'center', paddingHorizontal: 18 }}>
              {error}
            </Text>
          ) : null}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable
              onPress={handleCapture}
              disabled={analyzing}
              style={[styles.primaryBtn, { backgroundColor: c.terra }, analyzing && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Hacer foto y analizar"
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: Fonts.sans }}>
                📷 Analizar mi nevera
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          {result.ingredients.length > 0 ? (
            <>
              <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>HE VISTO</Text>
              <View style={styles.chipWrap}>
                {result.ingredients.map((ing) => (
                  <View key={ing} style={[styles.chip, { borderColor: c.line, backgroundColor: c.surface }]}>
                    <Text style={{ fontSize: 12, color: c.ink, fontFamily: Fonts.sans }}>{ing}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
            RECETAS CON ESO ({result.recipes.length})
          </Text>
          {result.recipes.map((r, i) => {
            const servings = r.servings && r.servings > 0 ? r.servings : 1;
            const saved = savedIdx.has(i);
            return (
              <View key={`${r.name}-${i}`} style={[styles.card, { borderColor: c.line, backgroundColor: c.surface }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>{r.name}</Text>
                <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 18 }} numberOfLines={3}>
                  {r.description}
                </Text>
                <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                  {Math.round(r.calories / servings)} kcal · {Math.round(r.protein / servings)} P por ración
                </Text>
                <Pressable
                  onPress={() => handleSaveRecipe(r, i)}
                  disabled={saved || savingIdx !== null}
                  style={[
                    styles.saveBtn,
                    saved ? { borderColor: c.sage, backgroundColor: c.sageSoft } : { borderColor: c.terra },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Guardar ${r.name}`}
                >
                  {savingIdx === i ? (
                    <ActivityIndicator color={c.terra} size="small" />
                  ) : (
                    <Text style={{ color: saved ? c.sage : c.terra, fontSize: 12.5, fontWeight: '700', fontFamily: Fonts.sans }}>
                      {saved ? '✓ Guardada' : 'Guardar en mis recetas'}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}

          {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}

          <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 17 }}>
            Las cantidades son estimaciones de la IA a partir de la foto: revísalas antes de fiarte de los macros.
          </Text>

          <Pressable
            onPress={() => {
              setResult(null);
              setError(null);
              setSavedIdx(new Set());
            }}
            style={styles.secondaryBtn}
            accessibilityRole="button"
          >
            <Text style={{ color: c.inkSoft, fontSize: 13, fontFamily: Fonts.sans }}>Hacer otra foto</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingBottom: 10 },
  closeBtn: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cameraWrap: { flex: 1, margin: 18, borderRadius: Radii.panel, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  analyzing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(58,36,20,0.55)',
  },
  footer: { paddingHorizontal: 18, paddingTop: 6 },
  body: { paddingHorizontal: 18, gap: 10 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.2, borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  card: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 11, gap: 4 },
  saveBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginTop: 6 },
  primaryBtn: { borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 8 },
});
