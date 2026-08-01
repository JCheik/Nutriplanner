import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { ChefieMascot } from '@/components/chefie-mascot';
import { PaperTexture } from '@/components/paper-texture';
import { ScreenTitle } from '@/components/screen-scaffold';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { sendFeedback } from '@/firebase/feedback-operations';
import { useTheme } from '@/hooks/use-theme';

const EJEMPLOS = [
  'Algo que no funciona o se ve raro',
  'Una receta con macros que no cuadran',
  'Algo que echas de menos',
];

/**
 * "Contar un problema": el canal de los testers durante el alfa. Escribe en la
 * colección `feedback`, que el usuario admin lee desde la web — sin correo de
 * por medio y con el contexto ya adjunto.
 */
export default function FeedbackScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (busy || !message.trim()) return;
    setBusy(true);
    setError(null);
    const result = await sendFeedback(message);
    if (result.ok) setSent(true);
    else setError(result.error);
    setBusy(false);
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
        <PaperTexture />
        <View style={styles.doneBody}>
          <ChefieMascot pose="thumbsup" size={92} />
          <Text style={{ fontSize: 20, color: c.ink, fontFamily: Fonts.serif, textAlign: 'center' }}>Recibido</Text>
          <Text
            style={{ fontSize: 13.5, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center', lineHeight: 20 }}
          >
            Gracias. Va directo al panel, con la versión de la app y tu móvil, así que no hace falta que expliques
            nada más.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.cta, Shadows.card, { backgroundColor: c.terra, marginTop: 12 }]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans }}>Volver</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}
    >
      <PaperTexture />
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ScreenTitle compact eyebrow="Estamos en pruebas" title="Contar un problema" />
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
        <Text style={{ fontSize: 13.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 20 }}>
          Cuéntamelo tal cual: qué hacías y qué esperabas que pasara. Cuanto más concreto, antes lo arreglo.
        </Text>

        <TextInput
          style={[
            styles.input,
            Shadows.card,
            { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans },
          ]}
          placeholder="Por ejemplo: al pegar el lunes en el jueves, el jueves se quedó vacío."
          placeholderTextColor={c.inkSoft}
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          editable={!busy}
          maxLength={4000}
        />

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>SIRVE PARA</Text>
        {EJEMPLOS.map((e) => (
          <View key={e} style={styles.bullet}>
            <Ionicons name="ellipse" size={5} color={c.inkSoft} style={{ marginTop: 6 }} />
            <Text style={{ flex: 1, fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 18 }}>
              {e}
            </Text>
          </View>
        ))}

        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16, marginTop: 8 }}>
          Se envía con tu correo, la versión de la app ({Constants.expoConfig?.version ?? '—'}) y el modelo de tu
          móvil. Nada más: ni tus recetas ni tu plan.
        </Text>

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          onPress={handleSend}
          disabled={busy || !message.trim()}
          style={[
            styles.cta,
            Shadows.card,
            { backgroundColor: c.terra },
            (busy || !message.trim()) && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans }}>Enviar</Text>
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
  miniLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginTop: 10 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    minHeight: 130,
    marginTop: 4,
  },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  footer: { paddingHorizontal: 18, paddingTop: 6 },
  cta: { borderRadius: Radii.card, paddingHorizontal: 22, paddingVertical: 14, alignItems: 'center' },
  doneBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 8 },
});
