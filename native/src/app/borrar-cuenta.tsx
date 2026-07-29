import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaperTexture } from '@/components/paper-texture';
import { ScreenTitle } from '@/components/screen-scaffold';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { deleteOwnAccount } from '@/firebase/auth-operations';
import { useTheme } from '@/hooks/use-theme';

const CONFIRM_WORD = 'BORRAR';

const QUE_SE_BORRA = [
  'Tu cuenta y tu perfil (objetivo, entrevista, preferencias)',
  'Tu plan semanal y las semanas que tengas guardadas',
  'Tus recetas y tus alimentos privados, con sus fotos',
  'Tu lista de la compra',
];

/**
 * Borrado de la propia cuenta. Google Play y App Store lo exigen para publicar:
 * si te puedes registrar desde la app, tienes que poder borrarte desde la app.
 *
 * Es irreversible y no pide contraseña (el servidor ya tiene el token
 * verificado), así que la protección contra el toque accidental es escribir la
 * palabra: sin ella el botón no se activa.
 */
export default function BorrarCuentaScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirm.trim().toUpperCase() === CONFIRM_WORD && !busy;

  const handleDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    const result = await deleteOwnAccount();
    if (result.ok) {
      // El borrado cierra la sesión: el gate de auth devuelve al login solo.
      return;
    }
    setError(result.error);
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <PaperTexture />
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ScreenTitle compact eyebrow="Esto no tiene vuelta atrás" title="Borrar mi cuenta" />
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
        <View style={[styles.card, Shadows.card, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>
            Se borra todo, y no se puede recuperar
          </Text>
          {QUE_SE_BORRA.map((item) => (
            <View key={item} style={styles.bullet}>
              <Ionicons name="close-circle-outline" size={14} color={c.terra} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 12.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 18 }}>
                {item}
              </Text>
            </View>
          ))}
          <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 17, marginTop: 4 }}>
            No se borran las recetas del recetario de Nutrilp ni los alimentos del catálogo compartido: son de todo el
            mundo y otras recetas dependen de ellos.
          </Text>
        </View>

        <Text style={{ fontSize: 13, color: c.ink, fontFamily: Fonts.sans, lineHeight: 19 }}>
          Si solo quieres dejar de usar la app un tiempo, cierra sesión y ya está: tus datos te esperan. Borrar la
          cuenta es definitivo.
        </Text>

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
          ESCRIBE {CONFIRM_WORD} PARA CONFIRMAR
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans },
          ]}
          placeholder={CONFIRM_WORD}
          placeholderTextColor={c.inkSoft}
          autoCapitalize="characters"
          autoCorrect={false}
          value={confirm}
          onChangeText={setConfirm}
          editable={!busy}
        />

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}

        <Pressable
          onPress={handleDelete}
          disabled={!canDelete}
          style={[styles.deleteBtn, { backgroundColor: c.terra }, !canDelete && { opacity: 0.45 }]}
          accessibilityRole="button"
          accessibilityLabel="Borrar mi cuenta definitivamente"
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: Fonts.sans }}>
              Borrar mi cuenta definitivamente
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} disabled={busy} accessibilityRole="button" accessibilityLabel="Cancelar">
          <Text style={{ fontSize: 13, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
            Mejor no, volver
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingBottom: 12 },
  closeBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 24, gap: 12 },
  card: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 13, paddingVertical: 12, gap: 6 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  miniLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    letterSpacing: 2,
  },
  deleteBtn: { borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
});
