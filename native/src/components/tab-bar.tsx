import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Structural subset of react-navigation's BottomTabBarProps — expo-router 57
 * vendors its own fork of bottom-tabs whose types clash with the standalone
 * package, so we type only the surface we actually use.
 */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    // Typed `any` at both ends: the real emit is generic over the event map
    // and both its param and return types vary per expo-router version.
    emit: (event: any) => any;
    navigate: (name: string) => void;
  };
}

/** Icono por pestaña: relleno cuando está activa, contorno cuando no. */
const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  index: { on: 'calendar', off: 'calendar-outline' },
  recetas: { on: 'restaurant', off: 'restaurant-outline' },
  compra: { on: 'cart', off: 'cart-outline' },
  perfil: { on: 'person', off: 'person-outline' },
};

/**
 * Tab bar de 5 huecos de los bocetos: Plan · Recetas · [IA] · Compra · Perfil,
 * con el botón de IA elevado como círculo terracota relleno.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.surface,
          borderTopColor: c.line,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const active = state.index === index;
        const isIA = route.name === 'ia';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) navigation.navigate(route.name);
        };

        const tint = active || isIA ? c.terra : c.inkSoft;
        const icon = ICONS[route.name];

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            {isIA ? (
              <View style={[styles.iaCircle, { backgroundColor: c.terra }]}>
                <Ionicons name="sparkles" size={21} color="#FFFFFF" />
              </View>
            ) : (
              <Ionicons name={active ? icon.on : icon.off} size={23} color={tint} />
            )}
            <Text style={[styles.label, { color: tint, fontFamily: Fonts.sans }, active && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iaCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
    // RN 0.86 cross-platform box shadow (shadow*/elevation are deprecated).
    boxShadow: '0 4px 10px rgba(217, 83, 31, 0.4)',
  },
  label: {
    fontSize: 10,
  },
  labelActive: {
    fontWeight: '700',
  },
});
