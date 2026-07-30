import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot } from '@/components/chefie-mascot';
import { PaperTexture } from '@/components/paper-texture';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { firestore } from '@/firebase';
import { importRecipeFromUrl } from '@/firebase/ai-client';
import { useCollection } from '@/firebase/firestore-hooks';
import { useTheme } from '@/hooks/use-theme';
import { setPendingRecipe } from '@/lib/generated-recipe-store';
import type { BaseIngredient } from '@/lib/types';

/** De dónde viene el enlace, solo para que el mensaje suene concreto. */
function sourceName(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('instagram')) return 'Instagram';
  if (u.includes('tiktok')) return 'TikTok';
  if (u.includes('youtu')) return 'YouTube';
  if (u.includes('pinterest')) return 'Pinterest';
  if (u.includes('facebook')) return 'Facebook';
  return 'ese enlace';
}

/**
 * Importar una receta desde un enlace compartido. Es la pantalla a la que cae
 * el "Compartir → Nutrilp" de Instagram/TikTok (ver `share-intent-handler`).
 * Lanza la importación sola al abrirse y, cuando la IA responde, deja la receta
 * en la pantalla de revisión de siempre para que el usuario la apruebe.
 */
export default function ImportarScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { url, text } = useLocalSearchParams<{ url?: string; text?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  // Evita que un re-render dispare una segunda importación (y gaste cuota).
  const startedRef = useRef(false);

  const ingredientsRef = useMemo(() => collection(firestore, 'ingredients'), []);
  const { data: catalog } = useCollection<BaseIngredient>(ingredientsRef);

  const runImport = useCallback(async () => {
    if (!url && !text) {
      setError('No he recibido nada que importar.');
      setBusy(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await importRecipeFromUrl({
        ...(url ? { url } : {}),
        ...(text ? { text } : {}),
        existingIngredients: (catalog ?? []).map((i) => i.name),
      });
      if (!result?.recipe) {
        setError('No he conseguido sacar una receta de ese enlace.');
        setBusy(false);
        return;
      }
      setPendingRecipe(result.recipe);
      router.replace('/receta-nueva');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo importar la receta.');
      setBusy(false);
    }
  }, [url, text, catalog, router]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runImport();
  }, [runImport]);

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <PaperTexture />
      <View style={styles.body}>
        {/* Pensando mientras la IA trabaja; encogido de hombros si no salió. */}
        <ChefieMascot pose={error ? 'shrug' : 'thinking'} size={104} />

        {busy ? (
          <>
            <Text style={[styles.title, { color: c.ink, fontFamily: Fonts.serif }]}>
              {url ? `Leyendo ${sourceName(url)}…` : 'Leyendo lo que me has pasado…'}
            </Text>
            <Text style={[styles.lede, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
              {url
                ? 'Si el post trae vídeo, lo veo entero para sacar los pasos. Puede tardar hasta un minuto.'
                : 'Saco los ingredientes y estimo los macros. Suele tardar unos segundos.'}
            </Text>
            <ActivityIndicator color={c.terra} style={{ marginTop: 6 }} />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: c.ink, fontFamily: Fonts.serif }]}>No ha podido ser</Text>
            <Text style={[styles.lede, { color: c.inkSoft, fontFamily: Fonts.sans }]}>{error}</Text>
            <Text style={[styles.hint, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
              Con publicaciones privadas no hay nada que leer. En ese caso, copia el texto de la receta y pégalo en
              nutrilp.com, que sí admite pegarlo a mano.
            </Text>

            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  startedRef.current = true;
                  runImport();
                }}
                style={[styles.btn, Shadows.card, { backgroundColor: c.terra }]}
                accessibilityRole="button"
                accessibilityLabel="Reintentar"
              >
                <Ionicons name="refresh" size={15} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 13.5, fontWeight: '700', fontFamily: Fonts.sans }}>
                  Reintentar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace('/recetas')}
                style={[styles.btn, { borderWidth: 1.5, borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel="Volver a mis recetas"
              >
                <Text style={{ color: c.inkSoft, fontSize: 13.5, fontWeight: '700', fontFamily: Fonts.sans }}>
                  Volver
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 8 },
  title: { fontSize: 22, textAlign: 'center' },
  lede: { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  hint: { fontSize: 11.5, textAlign: 'center', lineHeight: 17, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.card,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
});
