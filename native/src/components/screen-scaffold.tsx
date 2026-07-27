import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shared screen shell for the F0 stubs: cream ground, serif title, scrollable
 * body. Real screens will replace this progressively (F1+).
 */
export function ScreenScaffold({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: c.ground, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.ink, fontFamily: Fonts.serif }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: c.inkSoft, fontFamily: Fonts.sans }]}>{subtitle}</Text> : null}
      </View>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
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

  return <View style={[styles.card, toneStyle]}>{children}</View>;
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
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  body: { paddingHorizontal: 18, paddingBottom: 24, gap: 10 },
  card: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
});
