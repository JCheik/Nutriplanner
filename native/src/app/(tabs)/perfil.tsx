import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, CardText, ScreenScaffold } from '@/components/screen-scaffold';
import { Fonts, Radii } from '@/constants/theme';
import { firestore } from '@/firebase';
import { logOut, useAuthUser } from '@/firebase/auth-context';
import { useCollection } from '@/firebase/firestore-hooks';
import { deleteWeekSnapshot, restoreWeek, saveWeekSnapshot } from '@/firebase/plan-operations';
import { useProfile, useWeekPlan } from '@/hooks/use-nutrilp-data';
import { useOnboardingFlag } from '@/hooks/use-onboarding-flag';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference, type ThemePreference } from '@/hooks/use-theme-preference';
import { DIET_TAG_LABELS } from '@/lib/constants';
import type { WeekHistoryEntry } from '@/lib/types';

/** La web es donde viven las páginas legales (una sola copia, no duplicarlas). */
const WEB_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://nutrilp.com').replace(/\/$/, '');

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'light', label: 'Claro', icon: 'sunny-outline' },
  { key: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { key: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
];

/**
 * Perfil — pestaña 5. Difiere del boceto 9 a propósito: sin pestaña "Progreso"
 * (registro diario), ver PLAN-app-nativa.md norte §3. Objetivo y entrevista se
 * resumen aquí y se editan en sus propias pantallas (`/objetivos`, `/entrevista`).
 */
export default function PerfilScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user } = useAuthUser();
  const { profile, activeGoalMacros } = useProfile();
  const { weekPlan } = useWeekPlan();
  const { preference, setPreference } = useThemePreference();
  // Mismo flag que consume `GuidedTour`: al reactivarlo, el tour reaparece solo.
  const { showAgain: showTourAgain } = useOnboardingFlag('native-tour');
  const historyRef = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'weekHistory') : null),
    [user]
  );
  const { data: history } = useCollection<WeekHistoryEntry>(historyRef);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const interview = profile?.nutriInterview;
  const diet = (profile?.dietPreference ?? []).map((t) => DIET_TAG_LABELS[t] ?? t).join(', ');

  const planHasContent = weekPlan.some((d) => d.meals.some((m) => m.recipes.length > 0));
  const sortedHistory = [...(history ?? [])].sort((a, b) => b.savedAt - a.savedAt);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice(okMsg);
    } catch {
      setNotice('No se pudo completar. Revisa tu conexión.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveWeek = () =>
    run(async () => {
      const label = `Semana del ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
      await saveWeekSnapshot(user!.uid, label, weekPlan);
    }, 'Semana guardada en el historial.');

  return (
    <ScreenScaffold eyebrow="Tu cuenta" title="Perfil" subtitle={profile?.name || user?.email || ''}>
      <Pressable
        onPress={() => router.push('/objetivos')}
        style={[
          styles.linkCard,
          activeGoalMacros
            ? { borderColor: c.terra, backgroundColor: c.terraSoft }
            : { borderColor: c.line, backgroundColor: c.surface },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Editar objetivo diario"
      >
        <View style={{ flex: 1, gap: 3 }}>
          <CardText bold>Objetivo diario</CardText>
          {activeGoalMacros ? (
            <CardText>
              {Math.round(activeGoalMacros.calories)} kcal · {Math.round(activeGoalMacros.protein)} P ·{' '}
              {Math.round(activeGoalMacros.carbs)} C · {Math.round(activeGoalMacros.fat)} G
            </CardText>
          ) : (
            <CardText>Sin objetivo configurado todavía.</CardText>
          )}
          <CardText>Toca para abrir la calculadora.</CardText>
        </View>
        <Ionicons name="chevron-forward" size={17} color={c.inkSoft} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/entrevista')}
        style={[styles.linkCard, { borderColor: c.line, backgroundColor: c.surface }]}
        accessibilityRole="button"
        accessibilityLabel="Editar la entrevista"
      >
        <View style={{ flex: 1, gap: 3 }}>
          <CardText bold>La entrevista</CardText>
          {interview ? (
            <CardText>
              {diet ? `Dieta: ${diet}. ` : 'Sin preferencia de dieta. '}
              {interview.favoriteFoods.length} favoritos · {interview.avoidFoods.length} a evitar ·{' '}
              {interview.allergies.length} alergias
              {typeof interview.freeMealsPerWeek === 'number'
                ? ` · ${interview.freeMealsPerWeek} comidas libres/sem`
                : ''}
            </CardText>
          ) : (
            <CardText>Aún sin hacer — la IA te conocerá mucho mejor si la completas.</CardText>
          )}
          <CardText>Toca para responderla o cambiarla.</CardText>
        </View>
        <Ionicons name="chevron-forward" size={17} color={c.inkSoft} />
      </Pressable>

      <Card>
        <CardText bold>Historial de semanas</CardText>
        {notice ? <CardText>{notice}</CardText> : null}
        <Pressable
          onPress={handleSaveWeek}
          disabled={busy || !user || !planHasContent}
          style={[styles.historyBtn, { borderColor: c.terra }, (!planHasContent || busy) && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Guardar semana actual"
        >
          <Text style={{ color: c.terra, fontWeight: '700', fontSize: 12.5, fontFamily: Fonts.sans }}>
            Guardar semana actual
          </Text>
        </Pressable>
        {sortedHistory.length === 0 ? (
          <CardText>Aún no has guardado ninguna semana.</CardText>
        ) : (
          sortedHistory.map((entry) => (
            <View key={entry.id} style={[styles.historyRow, { borderColor: c.line }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }} numberOfLines={1}>
                  {entry.label}
                </Text>
                <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
                  {new Date(entry.savedAt).toLocaleDateString('es-ES')}
                </Text>
              </View>
              <Pressable
                onPress={() => run(() => restoreWeek(user!.uid, entry.days), 'Semana restaurada en el plan.')}
                disabled={busy}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Restaurar ${entry.label}`}
              >
                <Text style={{ color: c.sage, fontSize: 12, fontWeight: '700', fontFamily: Fonts.sans }}>
                  Restaurar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => run(() => deleteWeekSnapshot(user!.uid, entry.id), 'Semana borrada del historial.')}
                disabled={busy}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Borrar ${entry.label}`}
              >
                <Text style={{ color: c.inkSoft, fontSize: 12, fontFamily: Fonts.sans }}>Borrar</Text>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Pressable
        onPress={() => showTourAgain()}
        style={[styles.librito, { borderColor: c.line, backgroundColor: c.surface }]}
        accessibilityRole="button"
        accessibilityLabel="Ver el tour otra vez"
      >
        <Ionicons name="compass-outline" size={17} color={c.sage} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>
            Ver el tour otra vez
          </Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Chefie te vuelve a explicar las pestañas.
          </Text>
        </View>
        <Text style={{ color: c.inkSoft, fontSize: 15 }}>›</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/librito')}
        style={[styles.librito, { borderColor: c.line, backgroundColor: c.surface }]}
        accessibilityRole="button"
        accessibilityLabel="Abrir El Librito"
      >
        <Text style={{ fontSize: 15 }}>📖</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.ink, fontFamily: Fonts.sans }}>El Librito</Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Tutoriales, precisión de macros y buena relación con la comida.
          </Text>
        </View>
        <Text style={{ color: c.inkSoft, fontSize: 15 }}>›</Text>
      </Pressable>

      <Card>
        <CardText bold>Aspecto</CardText>
        <CardText>Nutrilp va en claro, como la web. Si prefieres el oscuro, aquí lo cambias.</CardText>
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
      </Card>

      <Pressable
        onPress={() => logOut()}
        style={[styles.logout, { borderColor: c.terra }]}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
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
  logout: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  historyBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 4,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  librito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 4,
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
    marginTop: 6,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
});
