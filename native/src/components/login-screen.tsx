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
import Svg, { Path } from 'react-native-svg';

import { ChefieMascot } from '@/components/chefie-mascot';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import {
  GOOGLE_ENABLED,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/firebase/auth-operations';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'login' | 'signup';

/** La "G" oficial de Google, como pide su guía de marca para este botón. */
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/**
 * Entrada a la app contra el MISMO proyecto Firebase que la web: iniciar
 * sesión, **crear cuenta** y recuperar contraseña. Una cuenta creada aquí queda
 * igual que una creada en la web (ver `auth-operations.ts`).
 *
 * Google sigue fuera a propósito: necesita `expo-auth-session` + `expo-crypto`,
 * que son módulos nativos y NO están en el binario instalado — entraría por
 * compilación nueva, nunca por `eas update`. Detalle en DECISIONS.md.
 */
export function LoginScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const canSubmit =
    email.trim().length > 3 && password.length > 0 && (!isSignup || name.trim().length > 0) && !busy;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = isSignup
      ? await signUpWithEmail({ name, email, password })
      : await signInWithEmail({ email, password });
    // Si va bien, el AuthProvider recoge la sesión y esta pantalla desaparece.
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await signInWithGoogle();
    if (!result.ok) setError(result.error);
    // Si entró, el AuthProvider se encarga; si canceló, `ok` sin sesión y ya.
    setBusy(false);
  };

  const handleReset = async () => {
    if (email.trim().length < 4) {
      setError('Escribe tu correo arriba y vuelve a tocar aquí.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await resetPassword(email);
    if (result.ok) {
      setNotice(`Te he enviado un correo a ${email.trim()} para que pongas una contraseña nueva.`);
    } else {
      setError(result.error);
    }
    setBusy(false);
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
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center' }}>
          <ChefieMascot pose={isSignup ? 'celebrate' : 'idle'} size={78} />
        </View>
        <Text style={[styles.brand, { color: c.terra, fontFamily: Fonts.serif }]}>Nutrilp</Text>
        <Text style={[styles.lede, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
          {isSignup
            ? 'Crea tu cuenta y empieza a planificar la semana.'
            : 'Tu plan de comidas semanal. Entra con la misma cuenta que usas en la web.'}
        </Text>

        <View style={[styles.segment, { borderColor: c.line, backgroundColor: c.surface }]}>
          {(['login', 'signup'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => switchMode(m)}
              style={[styles.segmentItem, mode === m && { backgroundColor: c.terra }]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === m }}
              accessibilityLabel={m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: mode === m ? '700' : '400',
                  color: mode === m ? '#FFF' : c.inkSoft,
                  fontFamily: Fonts.sans,
                }}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </Text>
            </Pressable>
          ))}
        </View>

        {isSignup ? (
          <TextInput
            style={inputStyle}
            placeholder="Tu nombre"
            placeholderTextColor={c.inkSoft}
            autoCapitalize="words"
            autoComplete="name"
            value={name}
            onChangeText={setName}
            editable={!busy}
          />
        ) : null}

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
          placeholder={isSignup ? 'Contraseña (mínimo 6 caracteres)' : 'Tu contraseña'}
          placeholderTextColor={c.inkSoft}
          secureTextEntry
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          editable={!busy}
        />

        {error ? <Text style={[styles.error, { color: c.terra, fontFamily: Fonts.sans }]}>{error}</Text> : null}
        {notice ? <Text style={[styles.notice, { color: c.sage, fontFamily: Fonts.sans }]}>{notice}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.button, Shadows.card, { backgroundColor: c.terra }, !canSubmit && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel={isSignup ? 'Crear mi cuenta' : 'Entrar'}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.buttonText, { fontFamily: Fonts.sans }]}>
              {isSignup ? 'Crear mi cuenta' : 'Entrar'}
            </Text>
          )}
        </Pressable>

        {isSignup ? (
          <Text style={[styles.hint, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
            Al crear la cuenta se prepara tu semana vacía y tu perfil. Podrás entrar con este mismo correo en
            nutrilp.com.
          </Text>
        ) : (
          <Pressable onPress={handleReset} disabled={busy} accessibilityRole="button" accessibilityLabel="He olvidado mi contraseña">
            <Text style={[styles.link, { color: c.inkSoft, fontFamily: Fonts.sans }]}>He olvidado mi contraseña</Text>
          </Pressable>
        )}

        {GOOGLE_ENABLED ? (
          <>
            <View style={styles.separator}>
              <View style={[styles.separatorLine, { backgroundColor: c.line }]} />
              <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans }}>o</Text>
              <View style={[styles.separatorLine, { backgroundColor: c.line }]} />
            </View>
            <Pressable
              onPress={handleGoogle}
              disabled={busy}
              style={[styles.googleBtn, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }, busy && styles.buttonDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Continuar con Google"
            >
              <GoogleG size={17} />
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>
                Continuar con Google
              </Text>
            </Pressable>
            <Text style={[styles.hint, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
              Con Google vale igual para entrar y para crear la cuenta: si es tu primera vez, se crea sola.
            </Text>
          </>
        ) : (
          <Text style={[styles.hint, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
            ¿Tu cuenta es de Google y aquí no ves el botón? Usa &quot;He olvidado mi contraseña&quot; con ese mismo correo para
            ponerle una, y entras con ella. Son la misma cuenta.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24, gap: 11 },
  brand: { fontSize: 40, textAlign: 'center', letterSpacing: -0.5 },
  lede: { fontSize: 13.5, textAlign: 'center', marginBottom: 10, lineHeight: 19 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: Radii.card,
    overflow: 'hidden',
    marginBottom: 4,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: { fontSize: 13, textAlign: 'center' },
  notice: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  button: {
    borderRadius: Radii.card,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  link: { fontSize: 13, textAlign: 'center', textDecorationLine: 'underline', marginTop: 2 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  separatorLine: { flex: 1, height: 1 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingVertical: 13,
  },
  hint: { fontSize: 11.5, textAlign: 'center', marginTop: 6, lineHeight: 16 },
});
