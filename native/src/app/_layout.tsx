import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ChefieBubble } from '@/components/chefie-bubble';
import { LoginScreen } from '@/components/login-screen';
import { ShareIntentHandler } from '@/components/share-intent-handler';
import { UpdateBanner } from '@/components/update-banner';
import { AuthProvider, useAuthUser } from '@/firebase/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { ThemePreferenceProvider, useResolvedScheme } from '@/hooks/use-theme-preference';

// La splash se mantiene hasta que las fuentes estén listas: si no, el primer
// frame sale con la fuente del sistema y "salta" al cambiar.
SplashScreen.preventAutoHideAsync();

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
    <>
      <ShareIntentHandler />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="receta/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="anadir" options={{ presentation: 'modal' }} />
      <Stack.Screen name="cocina/[id]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="receta-crear" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receta-ia" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receta-nueva" options={{ presentation: 'modal' }} />
      <Stack.Screen name="nevera" options={{ presentation: 'modal' }} />
      <Stack.Screen name="objetivos" />
      <Stack.Screen name="entrevista" />
      <Stack.Screen name="productos" options={{ presentation: 'modal' }} />
      <Stack.Screen name="librito" />
        <Stack.Screen name="borrar-cuenta" options={{ presentation: 'modal' }} />
        <Stack.Screen name="importar" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plan-anadir" options={{ presentation: 'modal' }} />
        <Stack.Screen name="receta-editar" options={{ presentation: 'modal' }} />
        <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recordatorios" />
      </Stack>
      {/* Dentro del gate: los trabajos son de IA y necesitan sesión. Va después
          del Stack para pintarse encima de cualquier pantalla. */}
      <ChefieBubble />
    </>
  );
}

export default function RootLayout() {
  // Playfair (títulos) y Kalam (la compra) son las mismas de la web. Se cargan
  // en runtime para que lleguen por `eas update` sin recompilar el binario.
  //
  // Se apunta al .ttf CONCRETO, no al índice del paquete: importar
  // `from '@expo-google-fonts/playfair-display'` arrastra los 16 pesos (y los 3
  // de Kalam) al bundle porque Metro no descarta assets sin usar — 4 MB de más
  // en cada update.
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold: require('@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf'),
    Kalam_400Regular: require('@expo-google-fonts/kalam/400Regular/Kalam_400Regular.ttf'),
    Kalam_700Bold: require('@expo-google-fonts/kalam/700Bold/Kalam_700Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Si las fuentes fallan (`fontError`) se sigue adelante: RN cae a la del
  // sistema y la app funciona igual, solo se ve menos bonita.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemePreferenceProvider>
      <AuthProvider>
        {/* La barra de estado sigue al tema ELEGIDO, no al del móvil: con la app
            en claro y el sistema en oscuro, "auto" dejaba iconos blancos
            invisibles sobre el crema. */}
        <ThemedStatusBar />
        <Gate />
        {/* Fuera del gate y después de él: pinta por encima de todo y sale
            también sin sesión iniciada. */}
        <UpdateBanner />
      </AuthProvider>
    </ThemePreferenceProvider>
  );
}

function ThemedStatusBar() {
  return <StatusBar style={useResolvedScheme() === 'dark' ? 'light' : 'dark'} />;
}
