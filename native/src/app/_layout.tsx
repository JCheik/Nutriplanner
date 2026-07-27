import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { LoginScreen } from '@/components/login-screen';
import { AuthProvider, useAuthUser } from '@/firebase/auth-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Root: auth gate around the whole app. Every screen needs a signed-in user
 * (same Firebase project as the web), so the gate lives here instead of
 * per-route guards. Inside, a Stack hosts the tab shell plus detail screens.
 */
function Gate() {
  const c = useTheme();
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.ground }}>
        <ActivityIndicator color={c.terra} size="large" />
      </View>
    );
  }
  if (!user) return <LoginScreen />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="receta/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="anadir" options={{ presentation: 'modal' }} />
      <Stack.Screen name="cocina/[id]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="receta-nueva" options={{ presentation: 'modal' }} />
      <Stack.Screen name="nevera" options={{ presentation: 'modal' }} />
      <Stack.Screen name="objetivos" />
      <Stack.Screen name="entrevista" />
      <Stack.Screen name="productos" options={{ presentation: 'modal' }} />
      <Stack.Screen name="librito" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Gate />
    </AuthProvider>
  );
}
