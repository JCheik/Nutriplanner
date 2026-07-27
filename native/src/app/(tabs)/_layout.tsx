import { Tabs } from 'expo-router';

import { GuidedTour } from '@/components/guided-tour';
import { TabBar } from '@/components/tab-bar';

/**
 * The 5-tab shell from the wireframes: Plan · Recetas · IA (elevated center) ·
 * Compra · Perfil. Auth gate and StatusBar live in the root layout.
 *
 * El tour de bienvenida se monta aquí (no dentro de una pestaña) porque navega
 * entre ellas: así sobrevive a los cambios de pestaña y se dibuja encima.
 */
export default function TabsLayout() {
  return (
    <>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Plan' }} />
        <Tabs.Screen name="recetas" options={{ title: 'Recetas' }} />
        <Tabs.Screen name="ia" options={{ title: 'IA' }} />
        <Tabs.Screen name="compra" options={{ title: 'Compra' }} />
        <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      </Tabs>
      <GuidedTour />
    </>
  );
}
