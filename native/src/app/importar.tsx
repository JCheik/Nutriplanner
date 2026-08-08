import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot } from '@/components/chefie-mascot';
import { PaperTexture } from '@/components/paper-texture';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { isJobRunning } from '@/lib/background-job';
import { parseImportInput, runImportJob, type ImportInput } from '@/lib/import-job';
import { useTheme } from '@/hooks/use-theme';

/**
 * Pedir una receta a partir de un enlace.
 *
 * Dos caminos hasta aquí: el "Compartir → Nutrilp" de Instagram o TikTok, que
 * llega con parámetros, y el botón "Importar de un enlace" de Recetas, que
 * llega vacío.
 *
 * En los dos casos esta pantalla NO espera: lanza el trabajo y se cierra. La
 * importación puede tardar un minuto largo si hay vídeo, y tener al usuario
 * mirando una ruleta sin poder hacer nada era lo que había antes. El progreso
 * lo cuenta `ChefieBubble` desde una esquina, encima de lo que estés haciendo.
 */
export default function ImportarScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { url, text } = useLocalSearchParams<{ url?: string; text?: string }>();

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/recetas');
  };

  const launch = (input: ImportInput) => {
    if (isJobRunning()) {
      setError('Ya estoy con otra receta. Espera a que termine esa, que es un momento.');
      return;
    }
    runImportJob(input); // a propósito sin await: corre por su cuenta
    leave();
  };

  // Llegada desde "Compartir": arranca solo y desaparece de en medio.
  useEffect(() => {
    if (startedRef.current) return;
    const shared: ImportInput | null = url ? { url } : text ? { text } : null;
    if (!shared) return;
    startedRef.current = true;
    launch(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, text]);

  const submit = () => {
    const parsed = parseImportInput(draft);
    if (!parsed) {
      setError('Pega el enlace de la receta (o el texto entero, si lo tienes copiado).');
      return;
    }
    launch(parsed);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <PaperTexture />

      <Pressable
        onPress={leave}
        style={[styles.close, { borderColor: c.line, right: 18, top: insets.top + 10 }]}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      >
        <Text style={{ color: c.inkSoft, fontSize: 15 }}>✕</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ChefieMascot pose="explain" size={92} />

        <Text style={[styles.title, { color: c.ink, fontFamily: Fonts.serif }]}>De un enlace o compartida</Text>
        <Text style={[styles.lede, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
          Pega abajo el enlace de CUALQUIER web de recetas, un reel, un TikTok o un vídeo de YouTube. Si trae vídeo, lo
          veo entero para sacar los pasos.
        </Text>

        <TextInput
          style={[
            styles.input,
            { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans },
          ]}
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
          onSubmitEditing={submit}
          accessibilityLabel="Enlace de la receta"
        />
        {error ? (
          <Text style={{ fontSize: 12, color: c.terra, fontFamily: Fonts.sans, textAlign: 'center' }}>{error}</Text>
        ) : null}

        <Pressable
          onPress={submit}
          style={[styles.btn, Shadows.card, { backgroundColor: c.terra, marginTop: 4 }]}
          accessibilityRole="button"
          accessibilityLabel="Importar la receta de este enlace"
        >
          <Ionicons name="sparkles" size={15} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 13.5, fontWeight: '700', fontFamily: Fonts.sans }}>Importar</Text>
        </Pressable>

        <Text style={[styles.hint, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
          Sigo yo con ello mientras tú haces otra cosa: te aviso desde la esquina en cuanto esté lista.
        </Text>

        {/* El otro camino, el que nadie descubre solo porque no está en esta
            app sino en el menú de OTRA. Se explica con los tres toques
            exactos, que es como lo pidió el usuario. */}
        <View style={[styles.shareBox, { borderColor: c.line, backgroundColor: c.surface }]}>
          <Text style={[styles.shareTitle, { color: c.ink, fontFamily: Fonts.sans }]}>
            O sin pasar por aquí
          </Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 17 }}>
            Cuando estés viendo la receta en Instagram, TikTok, YouTube o el navegador:
          </Text>
          {[
            { n: '1', t: 'Dale al botón de compartir de esa app.' },
            { n: '2', t: 'En la lista de «Compartir en», busca Nutrilp.' },
            { n: '3', t: 'Ya está. Me pongo con ella y te aviso.' },
          ].map((s) => (
            <View key={s.n} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: c.terraSoft }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.terra, fontFamily: Fonts.sans }}>{s.n}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: c.ink, fontFamily: Fonts.sans, lineHeight: 17 }}>
                {s.t}
              </Text>
            </View>
          ))}
          <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16 }}>
            Si no ves Nutrilp en la lista, desliza hasta el final y toca «Más».
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // `flexGrow` en vez de `flex`: centra mientras quepa y deja hacer scroll
  // cuando el teclado y el bloque de compartir ya no dejan sitio.
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24, gap: 8 },
  shareBox: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 7,
    marginTop: 18,
  },
  shareTitle: { fontSize: 13.5, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  stepNum: { width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
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
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.card,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
});
