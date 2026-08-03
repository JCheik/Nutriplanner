import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot } from '@/components/chefie-mascot';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { clearJob, useBackgroundJob } from '@/lib/background-job';
import { useTheme } from '@/hooks/use-theme';

/**
 * Chefie en pequeño, abajo a la derecha, contando en qué anda mientras tú
 * sigues usando la app.
 *
 * Al terminar NO te lleva solo: redirigir de golpe te sacaría de lo que
 * estuvieras haciendo, que es justo lo que se evita al mandarlo al fondo. Se
 * queda esperando a que lo toques.
 */
export function ChefieBubble() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const job = useBackgroundJob();

  if (!job) return null;

  const working = job.status === 'working';
  const done = job.status === 'done';

  const onPress = () => {
    if (working) return; // trabajando: la burbuja no hace nada
    if (job.status === 'done') {
      const target = job.target;
      clearJob();
      router.push(target);
      return;
    }
    clearJob(); // error: tocarla la descarta
  };

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + 74 }]}
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
    >
      <Pressable
        onPress={onPress}
        disabled={working}
        style={[
          styles.bubble,
          Shadows.card,
          { backgroundColor: c.surface, borderColor: done ? c.sage : job.status === 'error' ? c.terra : c.line },
        ]}
        accessibilityRole={working ? 'text' : 'button'}
        accessibilityLabel={
          working
            ? `${job.title}. Te aviso al terminar.`
            : done
              ? `${job.title}. ${job.cta}`
              : `${job.title}. ${job.message}`
        }
      >
        <ChefieMascot pose={working ? 'thinking' : done ? 'celebrate' : 'shrug'} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 12.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}
          >
            {job.title}
          </Text>
          <Text numberOfLines={2} style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 15 }}>
            {working ? 'Te aviso en cuanto esté.' : done ? job.cta : job.message}
          </Text>
        </View>
        {working ? (
          <ActivityIndicator color={c.terra} size="small" />
        ) : (
          <Ionicons name={done ? 'arrow-forward-circle' : 'close-circle'} size={20} color={done ? c.sage : c.terra} />
        )}
      </Pressable>

      {/* Descartar sin ir a ninguna parte. Mientras trabaja no se ofrece: no se
          puede cancelar la llamada, y esconderla dejaría al usuario sin saber
          que sigue en marcha. */}
      {!working ? (
        <Pressable
          onPress={clearJob}
          hitSlop={10}
          style={[styles.dismiss, { backgroundColor: c.ground, borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Descartar el aviso"
        >
          <Ionicons name="close" size={12} color={c.inkSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 40 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.panel,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 8,
  },
  dismiss: {
    position: 'absolute',
    top: -6,
    right: -4,
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
