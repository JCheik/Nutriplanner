import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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

type ImportInput = { url?: string; text?: string };

/**
 * Convierte lo que haya escrito el usuario en algo que el endpoint entienda.
 * Un enlace suelto va como `url`; si ha pegado la receta entera, como `text`.
 */
function parseInput(raw: string): ImportInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/https?:\/\/\S+/);
  if (match) return { url: match[0] };
  if (trimmed.length >= 20) return { text: trimmed };
  return null;
}

/**
 * Importar una receta desde un enlace.
 *
 * Dos caminos hasta aquí: el "Compartir → Nutrilp" de Instagram/TikTok, que
 * llega con parámetros y arranca solo, y el botón "Importar de un enlace" de
 * Recetas, que llega vacío y enseña un campo para pegarlo. Depender solo de lo
 * primero era frágil: cada app esconde el menú de compartir de Android en un
 * sitio distinto y hay gente que nunca lo encuentra.
 */
export default function ImportarScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { url, text } = useLocalSearchParams<{ url?: string; text?: string }>();

  const shared: ImportInput | null = useMemo(
    () => (url ? { url } : text ? { text } : null),
    [url, text]
  );

  const [status, setStatus] = useState<'form' | 'working' | 'error'>(shared ? 'working' : 'form');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Lo último que se intentó, para que "Reintentar" no dependa del campo.
  const lastInput = useRef<ImportInput | null>(shared);
  // Evita que un re-render dispare una segunda importación (y gaste cuota).
  const startedRef = useRef(false);

  const ingredientsRef = useMemo(() => collection(firestore, 'ingredients'), []);
  const { data: catalog } = useCollection<BaseIngredient>(ingredientsRef);
  // En una ref para que `runImport` no cambie de identidad cada vez que el
  // catálogo llega de Firestore — si no, el efecto de arranque se re-dispara.
  // Se escribe en un efecto, no en el render: con React Compiler activado,
  // mutar una ref durante el render es una violación.
  const catalogRef = useRef<BaseIngredient[] | null>(null);
  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  const runImport = useCallback(
    async (input: ImportInput) => {
      lastInput.current = input;
      setStatus('working');
      setError(null);
      try {
        const result = await importRecipeFromUrl({
          ...input,
          existingIngredients: (catalogRef.current ?? []).map((i) => i.name),
        });
        if (!result?.recipe) {
          setError('No he conseguido sacar una receta de ahí.');
          setStatus('error');
          return;
        }
        setPendingRecipe(result.recipe);
        router.replace('/receta-nueva');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo importar la receta.');
        setStatus('error');
      }
    },
    [router]
  );

  useEffect(() => {
    if (startedRef.current || !shared) return;
    startedRef.current = true;
    runImport(shared);
  }, [shared, runImport]);

  const submitDraft = () => {
    const parsed = parseInput(draft);
    if (!parsed) {
      setError('Pega el enlace de la receta (o el texto entero, si lo tienes copiado).');
      return;
    }
    runImport(parsed);
  };

  const working = status === 'working';
  const workingUrl = lastInput.current?.url;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <PaperTexture />

      {/* Sin esto no había forma de salir cuando la pantalla se abre vacía. */}
      {!working ? (
        <Pressable
          onPress={() => router.back()}
          style={[styles.close, { borderColor: c.line, right: 18, top: insets.top + 10 }]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Text style={{ color: c.inkSoft, fontSize: 15 }}>✕</Text>
        </Pressable>
      ) : null}

      <View style={styles.body}>
        <ChefieMascot pose={status === 'error' ? 'shrug' : 'thinking'} size={104} />

        {status === 'form' ? (
          <>
            <Text style={[styles.title, { color: c.ink, fontFamily: Fonts.serif }]}>Importar de un enlace</Text>
            <Text style={[styles.lede, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
              Pega el enlace de un reel, un TikTok, un vídeo de YouTube o cualquier página de recetas. Si trae vídeo,
              lo veo entero para sacar los pasos.
            </Text>

            <TextInput
              style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
              placeholder="https://…"
              placeholderTextColor={c.inkSoft}
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline
              onSubmitEditing={submitDraft}
              accessibilityLabel="Enlace de la receta"
            />
            {error ? (
              <Text style={{ fontSize: 12, color: c.terra, fontFamily: Fonts.sans, textAlign: 'center' }}>{error}</Text>
            ) : null}

            <Pressable
              onPress={submitDraft}
              style={[styles.btn, Shadows.card, { backgroundColor: c.terra, marginTop: 4 }]}
              accessibilityRole="button"
              accessibilityLabel="Importar la receta de este enlace"
            >
              <Ionicons name="sparkles" size={15} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 13.5, fontWeight: '700', fontFamily: Fonts.sans }}>
                Importar
              </Text>
            </Pressable>

            <Text style={[styles.hint, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
              También puedes compartir directamente a Nutrilp desde Instagram o TikTok, con el botón Compartir de la
              publicación.
            </Text>
          </>
        ) : working ? (
          <>
            <Text style={[styles.title, { color: c.ink, fontFamily: Fonts.serif }]}>
              {workingUrl ? `Leyendo ${sourceName(workingUrl)}…` : 'Leyendo lo que me has pasado…'}
            </Text>
            <Text style={[styles.lede, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
              {workingUrl
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
              Con publicaciones privadas no hay nada que leer. En ese caso copia el texto de la receta y pégalo aquí
              mismo, que también vale.
            </Text>

            <View style={styles.actions}>
              <Pressable
                onPress={() => lastInput.current && runImport(lastInput.current)}
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
                onPress={() => {
                  setError(null);
                  setStatus('form');
                }}
                style={[styles.btn, { borderWidth: 1.5, borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel="Probar con otro enlace"
              >
                <Text style={{ color: c.inkSoft, fontSize: 13.5, fontWeight: '700', fontFamily: Fonts.sans }}>
                  Otro enlace
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
  close: {
    position: 'absolute',
    zIndex: 2,
    width: 30,
    height: 30,
    borderWidth: 1.5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, textAlign: 'center' },
  lede: { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  hint: { fontSize: 11.5, textAlign: 'center', lineHeight: 17, marginTop: 4 },
  input: {
    alignSelf: 'stretch',
    minHeight: 46,
    maxHeight: 110,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 13.5,
    marginTop: 6,
  },
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
