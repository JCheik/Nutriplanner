import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { auth } from '@/firebase';
import { useTheme } from '@/hooks/use-theme';

/** Spanish messages for the auth error codes users actually hit. */
function loginErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Ese correo no tiene buena pinta. Revísalo.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento y vuelve a probar.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    default:
      return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}

/**
 * Email/password sign-in against the SAME Firebase project as the web — the
 * user's plan, recipes and interview are already there. Google Sign-In needs
 * native OAuth client IDs and lands later (see PLAN-app-nativa.md).
 */
export function LoginScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && password.length > 0 && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // AuthProvider picks up the session; no navigation needed.
    } catch (e: any) {
      setError(loginErrorMessage(e?.code ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    styles.input,
    { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: c.ground, paddingTop: insets.top }]}
    >
      <View style={styles.body}>
        <Text style={[styles.brand, { color: c.terra, fontFamily: Fonts.serif }]}>Nutrilp</Text>
        <Text style={[styles.lede, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
          Tu plan de comidas semanal. Entra con la misma cuenta que usas en la web.
        </Text>

        <TextInput
          style={inputStyle}
          placeholder="tu@correo.com"
          placeholderTextColor={c.inkSoft}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <TextInput
          style={inputStyle}
          placeholder="Tu contraseña"
          placeholderTextColor={c.inkSoft}
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          editable={!busy}
        />

        {error ? (
          <Text style={[styles.error, { color: c.terra, fontFamily: Fonts.sans }]}>{error}</Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.button, { backgroundColor: c.terra }, !canSubmit && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión"
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.buttonText, { fontFamily: Fonts.sans }]}>Iniciar sesión</Text>
          )}
        </Pressable>

        <Text style={[styles.hint, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
          ¿Sin cuenta o con Google? De momento crea la cuenta o gestiona el acceso desde nutrilp.com — el
          login con Google llegará a la app más adelante.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  brand: { fontSize: 42, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  lede: { fontSize: 14, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: { fontSize: 13, textAlign: 'center' },
  button: {
    borderRadius: Radii.card,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});
