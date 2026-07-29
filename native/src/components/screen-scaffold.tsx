import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaperTexture } from '@/components/paper-texture';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shared screen shell: fondo de papel (crema + trama de puntos), título serif,
 * cuerpo con scroll.
 */
export function ScreenScaffold({
  title,
  subtitle,
  eyebrow,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string; eyebrow?: string }>) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: c.ground, paddingTop: insets.top + 10 }]}>
      <PaperTexture />
      <View style={styles.header}>
        <ScreenTitle title={title} subtitle={subtitle} eyebrow={eyebrow} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
    </View>
  );
}

/**
 * Cabecera de pantalla con voz de marca: antetítulo en versalitas terracota,
 * título en Playfair y un subrayado corto. El título suelto en una esquina
 * "parecía un prototipo" (feedback del usuario), y esto lo convierte en una
 * portadilla sin robarle sitio al contenido. También la usan las pantallas que
 * no van con `ScreenScaffold` (Plan, Recetas), por eso se exporta.
 */
export function ScreenTitle({
  title,
  subtitle,
  eyebrow,
  compact,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  compact?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ minWidth: 0 }}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: c.terra, fontFamily: Fonts.sans }]} numberOfLines={1}>
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <Text
        style={[styles.title, compact && styles.titleCompact, { color: c.ink, fontFamily: Fonts.serif }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={[styles.rule, { backgroundColor: c.terra }]} />
      {subtitle ? <Text style={[styles.subtitle, { color: c.inkSoft, fontFamily: Fonts.sans }]}>{subtitle}</Text> : null}
    </View>
  );
}

/** Bordered card in the wireframes' style. `tone` picks the accent variant. */
export function Card({ tone = 'plain', children }: PropsWithChildren<{ tone?: 'plain' | 'terra' | 'sage' }>) {
  const c = useTheme();
  const toneStyle =
    tone === 'terra'
      ? { borderColor: c.terra, backgroundColor: c.terraSoft }
      : tone === 'sage'
        ? { borderColor: c.sage, backgroundColor: c.sageSoft }
        : { borderColor: c.line, backgroundColor: c.surface };

  return <View style={[styles.card, toneStyle, Shadows.card]}>{children}</View>;
}

export function CardText({ bold, children }: PropsWithChildren<{ bold?: boolean }>) {
  const c = useTheme();
  return (
    <Text
      style={{
        color: bold ? c.ink : c.inkSoft,
        fontFamily: Fonts.sans,
        fontSize: bold ? 14 : 12.5,
        fontWeight: bold ? '600' : '400',
        lineHeight: 19,
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 12 },
  eyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, marginBottom: 1 },
  title: { fontSize: 30, letterSpacing: -0.3 },
  titleCompact: { fontSize: 25 },
  rule: { width: 34, height: 3, borderRadius: 2, marginTop: 5, marginBottom: 1 },
  subtitle: { fontSize: 13, marginTop: 3 },
  body: { paddingHorizontal: 18, paddingBottom: 24, gap: 10 },
  card: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
});
