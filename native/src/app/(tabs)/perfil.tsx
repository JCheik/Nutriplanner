import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, CardText, ScreenScaffold } from '@/components/screen-scaffold';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { logOut, useAuthUser } from '@/firebase/auth-context';
import { useProfile } from '@/hooks/use-nutrilp-data';
import { useOnboardingFlag } from '@/hooks/use-onboarding-flag';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference, type ThemePreference } from '@/hooks/use-theme-preference';
import { DIET_TAG_LABELS } from '@/lib/constants';

/** La web es donde viven las páginas legales (una sola copia, no duplicarlas). */
const WEB_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://nutrilp.com').replace(/\/$/, '');

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'light', label: 'Claro', icon: 'sunny-outline' },
  { key: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { key: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
];

/**
 * Insignia redonda de icono. Es lo que da ritmo a la columna: cada tarjeta se
 * reconoce por su icono de un vistazo, sin tener que leer el título.
 *
 * A propósito NO hay un color por tarjeta. La paleta de la app son terracota y
 * sage (ver `constants/theme.ts`), y meter cinco pasteles distintos aquí haría
 * que Perfil no se pareciese al resto de la app. Distingue el icono, no el tono.
 */
function IconBadge({
  name,
  tone = 'neutral',
  big = false,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  tone?: 'neutral' | 'terra' | 'sage';
  big?: boolean;
}) {
  const c = useTheme();
  const { bg, fg } =
    tone === 'terra'
      ? { bg: c.terraSoft, fg: c.terra }
      : tone === 'sage'
        ? { bg: c.sageSoft, fg: c.sage }
        : { bg: c.chip, fg: c.inkSoft };
  const size = big ? 38 : 30;
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Ionicons name={name} size={big ? 19 : 16} color={fg} />
    </View>
  );
}

/**
 * Perfil — pestaña 5. Difiere del boceto 9 a propósito: sin pestaña "Progreso"
 * (registro diario), ver PLAN-app-nativa.md norte §3. Objetivo y entrevista se
 * resumen aquí y se editan en sus propias pantallas (`/objetivos`, `/entrevista`).
 *
 * Distribución rehecha el 2026-08-08 a partir del boceto del usuario, y
 * ordenada POR USO: el objetivo diario manda como tarjeta grande (es el dato
 * que se viene a mirar), después la entrevista, después las dos herramientas
 * que se tocan de verdad (Librito y recordatorios) y al final, en pequeño y
 * juntas, las tres de una sola vez: aspecto, tour y avisar de un fallo.
 *
 * El historial de semanas ya NO está aquí: guardar y recuperar una semana se
 * hace mirando el cuadrante, así que vive en la pestaña Plan, vista Semana.
 */
export default function PerfilScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user } = useAuthUser();
  const { profile, activeGoalMacros } = useProfile();
  const { preference, setPreference } = useThemePreference();
  // Mismo flag que consume `GuidedTour`: al reactivarlo, el tour reaparece solo.
  const { showAgain: showTourAgain } = useOnboardingFlag('native-tour');

  const interview = profile?.nutriInterview;
  const diet = (profile?.dietPreference ?? []).map((t) => DIET_TAG_LABELS[t] ?? t).join(', ');

  // El nombre sale del perfil; si aún no lo hay, de la parte del correo antes
  // de la arroba, que es mejor saludo que el correo entero.
  const displayName = profile?.name?.trim() || user?.email?.split('@')[0] || '';
  const firstName = displayName.split(/\s+/)[0] ?? '';
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '·';

  /**
   * Las dos que se usan de verdad, a tamaño completo. El Librito se lee y los
   * recordatorios se tocan cada semana; lo demás (el tour, avisar de un fallo,
   * el aspecto) se toca una vez y no se vuelve, así que baja al bloque de abajo.
   */
  const mainTools: {
    key: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    tone: 'terra' | 'sage';
    title: string;
    hint: string;
    onPress: () => void;
  }[] = [
    {
      key: 'librito',
      icon: 'book-outline',
      tone: 'terra',
      title: 'El Librito',
      hint: 'Tutoriales, precisión de macros y buena relación con la comida.',
      onPress: () => router.push('/librito'),
    },
    {
      key: 'recordatorios',
      icon: 'alarm-outline',
      tone: 'sage',
      title: 'Recordatorios',
      hint: 'Que Chefie te avise de lo que tú le digas, a la hora que quieras.',
      onPress: () => router.push('/recordatorios'),
    },
  ];

  return (
    <ScreenScaffold
      eyebrow={firstName ? `Hola, ${firstName} 👋` : 'Tu cuenta'}
      title="Perfil"
      subtitle="Aquí tienes tu objetivo, tus respuestas y los ajustes."
      headerRight={
        <View style={[styles.avatar, { borderColor: c.line, backgroundColor: c.terraSoft }]}>
          <Text style={{ fontSize: 20, color: c.terra, fontFamily: Fonts.serif }}>{initials}</Text>
        </View>
      }
    >
      {/* Objetivo diario: la tarjeta grande. Es el dato que se viene a mirar,
          así que va rellena y con las cuatro cifras a la vista, sin entrar. */}
      <Pressable
        onPress={() => router.push('/objetivos')}
        style={[styles.hero, Shadows.card, { backgroundColor: c.terra }]}
        accessibilityRole="button"
        accessibilityLabel="Editar objetivo diario"
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="flag-outline" size={15} color="#FFF" />
          </View>
          <Text style={[styles.heroTitle, { fontFamily: Fonts.serif }]}>Objetivo diario</Text>
          <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.75)" />
        </View>

        {activeGoalMacros ? (
          <View style={styles.heroStats}>
            {[
              { value: Math.round(activeGoalMacros.calories), label: 'kcal' },
              { value: Math.round(activeGoalMacros.protein), label: 'g proteína' },
              { value: Math.round(activeGoalMacros.carbs), label: 'g carbo' },
              { value: Math.round(activeGoalMacros.fat), label: 'g grasa' },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.heroValue, { fontFamily: Fonts.serif }]}>{s.value}</Text>
                <Text style={[styles.heroLabel, { fontFamily: Fonts.sans }]} numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.heroEmpty, { fontFamily: Fonts.sans }]}>
            Sin objetivo configurado todavía.
          </Text>
        )}

        <View style={styles.heroFooter}>
          <Ionicons name="calculator-outline" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={[styles.heroFooterText, { fontFamily: Fonts.sans }]}>
            {activeGoalMacros ? 'Toca para abrir la calculadora' : 'Toca para calcularlo'}
          </Text>
        </View>
      </Pressable>

      {/* La entrevista */}
      <Pressable
        onPress={() => router.push('/entrevista')}
        style={[styles.panel, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}
        accessibilityRole="button"
        accessibilityLabel="Editar la entrevista"
      >
        <View style={styles.panelHead}>
          <IconBadge name="chatbubbles-outline" tone="sage" />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <CardText bold>La entrevista</CardText>
            {interview ? (
              <>
                <CardText>{diet ? `Dieta: ${diet}` : 'Sin preferencia de dieta'}</CardText>
                <CardText>
                  {interview.favoriteFoods.length} favoritos · {interview.avoidFoods.length} a evitar ·{' '}
                  {interview.allergies.length} alergias
                </CardText>
                {typeof interview.freeMealsPerWeek === 'number' ? (
                  <CardText>{interview.freeMealsPerWeek} comidas libres/sem</CardText>
                ) : null}
              </>
            ) : (
              <CardText>Aún sin hacer — la IA te conocerá mucho mejor si la completas.</CardText>
            )}
          </View>
          <Ionicons name="chevron-forward" size={17} color={c.inkSoft} />
        </View>
        <View style={[styles.panelFoot, { borderColor: c.line }]}>
          <Text style={{ fontSize: 12, color: c.sage, fontWeight: '600', fontFamily: Fonts.sans }}>
            Toca para responderla o cambiarla
          </Text>
        </View>
      </Pressable>

      {/* Las dos herramientas de uso real, a ancho completo. */}
      {mainTools.map((t) => (
        <Pressable
          key={t.key}
          onPress={t.onPress}
          style={[styles.panel, Shadows.card, { borderColor: c.line, backgroundColor: c.surface }]}
          accessibilityRole="button"
          accessibilityLabel={t.title}
        >
          <View style={styles.panelHead}>
            <IconBadge name={t.icon} tone={t.tone} big />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>
                {t.title}
              </Text>
              <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 17 }}>
                {t.hint}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={c.inkSoft} />
          </View>
        </Pressable>
      ))}

      {/* Lo de una sola vez, junto y en pequeño: el tour, avisar de un fallo y
          el aspecto. Antes ocupaban lo mismo que el Librito y no lo merecen.
          El segmentado va debajo de su fila y no al lado como en el boceto:
          tres opciones con icono y etiqueta no caben en media pantalla de 375. */}
      <Card>
        <Text style={[styles.minorLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>AJUSTES Y AYUDA</Text>

        <View style={styles.minorRow}>
          <Ionicons name="color-palette-outline" size={15} color={c.inkSoft} />
          <Text style={{ flex: 1, fontSize: 13, color: c.ink, fontFamily: Fonts.sans }}>Aspecto</Text>
        </View>
        <View style={[styles.themeSegment, { borderColor: c.line }]}>
          {THEME_OPTIONS.map(({ key, label, icon }) => {
            const active = preference === key;
            return (
              <Pressable
                key={key}
                onPress={() => setPreference(key)}
                style={[styles.themeOption, active && { backgroundColor: c.terra }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Aspecto ${label}`}
              >
                <Ionicons name={icon} size={14} color={active ? '#FFF' : c.inkSoft} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: active ? '700' : '400',
                    color: active ? '#FFF' : c.inkSoft,
                    fontFamily: Fonts.sans,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => showTourAgain()}
          style={[styles.minorRow, styles.minorLink, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Ver el tour otra vez"
        >
          <Ionicons name="compass-outline" size={15} color={c.inkSoft} />
          <Text style={{ flex: 1, fontSize: 13, color: c.ink, fontFamily: Fonts.sans }}>Ver el tour otra vez</Text>
          <Ionicons name="chevron-forward" size={15} color={c.inkSoft} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/feedback')}
          style={[styles.minorRow, styles.minorLink, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Contar un problema"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={15} color={c.inkSoft} />
          <Text style={{ flex: 1, fontSize: 13, color: c.ink, fontFamily: Fonts.sans }}>Contar un problema</Text>
          <Ionicons name="chevron-forward" size={15} color={c.inkSoft} />
        </Pressable>
      </Card>

      <Pressable
        onPress={() => logOut()}
        style={[styles.logout, { borderColor: c.terra }]}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <Ionicons name="log-out-outline" size={15} color={c.terra} />
        <Text style={{ color: c.terra, fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>
          Cerrar sesión
        </Text>
      </Pressable>

      <View style={styles.legalRow}>
        <Pressable
          onPress={() => Linking.openURL(`${WEB_BASE_URL}/privacidad`)}
          accessibilityRole="link"
          accessibilityLabel="Ver la política de privacidad"
        >
          <Text style={[styles.legalLink, { color: c.inkSoft, fontFamily: Fonts.sans }]}>Privacidad</Text>
        </Pressable>
        <Text style={{ color: c.inkSoft, fontSize: 11 }}>·</Text>
        <Pressable
          onPress={() => Linking.openURL(`${WEB_BASE_URL}/terminos`)}
          accessibilityRole="link"
          accessibilityLabel="Ver los términos de uso"
        >
          <Text style={[styles.legalLink, { color: c.inkSoft, fontFamily: Fonts.sans }]}>Términos</Text>
        </Pressable>
        <Text style={{ color: c.inkSoft, fontSize: 11 }}>·</Text>
        <Pressable
          onPress={() => router.push('/borrar-cuenta')}
          accessibilityRole="button"
          accessibilityLabel="Borrar mi cuenta"
        >
          <Text style={[styles.legalLink, { color: c.terra, fontFamily: Fonts.sans }]}>Borrar mi cuenta</Text>
        </Pressable>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { alignItems: 'center', justifyContent: 'center' },
  minorLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.1, marginBottom: 4 },
  minorRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  minorLink: { borderTopWidth: 1, marginTop: 4 },

  hero: { borderRadius: Radii.panel, paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heroBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { flex: 1, fontSize: 17, color: '#FFF' },
  heroStats: { flexDirection: 'row', gap: 6 },
  heroValue: { fontSize: 19, color: '#FFF' },
  heroLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.82)', marginTop: 1 },
  heroEmpty: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingVertical: 8,
  },
  heroFooterText: { fontSize: 12, fontWeight: '600', color: '#FFF' },

  panel: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 14, paddingVertical: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  panelFoot: { borderTopWidth: 1, marginTop: 10, paddingTop: 9 },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingVertical: 12,
    marginTop: 8,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legalLink: { fontSize: 11.5, textDecorationLine: 'underline' },
  themeSegment: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: Radii.card,
    overflow: 'hidden',
    marginTop: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
  },
});
