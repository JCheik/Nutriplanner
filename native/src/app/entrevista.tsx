import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot, type ChefiePose } from '@/components/chefie-mascot';
import { Fonts, Radii } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { saveNutriInterview } from '@/firebase/profile-operations';
import { useProfile } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { DIET_TAGS } from '@/lib/constants';
import type { DietTag, NutriInterview } from '@/lib/types';

/**
 * "La entrevista" en la app. La web la plantea como asistente de 8 pasos; aquí
 * es un formulario único con secciones, porque en móvil desplazar es más
 * natural que encadenar 8 pantallas para editar un solo dato. Mismos campos y
 * mismo guardado (espeja dietTags en dietPreference).
 */

/** Campo de lista: chips que se añaden escribiendo y se quitan tocándolos. */
function ChipsField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  tone = 'terra',
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  tone?: 'terra' | 'sage';
}) {
  const c = useTheme();
  const [draft, setDraft] = useState('');
  const accent = tone === 'sage' ? c.sage : c.terra;
  const accentSoft = tone === 'sage' ? c.sageSoft : c.terraSoft;

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft('');
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>{label}</Text>
      {hint ? (
        <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16 }}>{hint}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1, borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={placeholder}
          placeholderTextColor={c.inkSoft}
          returnKeyType="done"
          accessibilityLabel={label}
        />
        <Pressable
          onPress={add}
          style={[styles.addBtn, { borderColor: accent }]}
          accessibilityRole="button"
          accessibilityLabel={`Añadir a ${label}`}
        >
          <Ionicons name="add" size={19} color={accent} />
        </Pressable>
      </View>
      {values.length > 0 ? (
        <View style={styles.chipRow}>
          {values.map((v) => (
            <Pressable
              key={v}
              onPress={() => onChange(values.filter((x) => x !== v))}
              style={[styles.chip, { borderColor: accent, backgroundColor: accentSoft }]}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${v}`}
            >
              <Text style={{ fontSize: 12, color: c.ink, fontFamily: Fonts.sans }}>{v}</Text>
              <Ionicons name="close" size={12} color={c.inkSoft} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  // Acepta actualizador, no un número ya calculado: con el valor capturado en
  // el render, tocar rápido tres veces solo contaba una.
  onChange: Dispatch<SetStateAction<number>>;
  min: number;
  max: number;
}) {
  const c = useTheme();
  return (
    <View style={[styles.stepperRow, { borderColor: c.line, backgroundColor: c.surface }]}>
      <Text style={{ flex: 1, fontSize: 13, color: c.ink, fontFamily: Fonts.sans }}>{label}</Text>
      <Pressable
        onPress={() => onChange((prev) => Math.max(min, prev - 1))}
        style={[styles.roundBtn, { borderColor: c.line }]}
        accessibilityRole="button"
        accessibilityLabel={`Menos ${label}`}
      >
        <Ionicons name="remove" size={15} color={c.inkSoft} />
      </Pressable>
      <Text style={{ minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
        {value}
      </Text>
      <Pressable
        onPress={() => onChange((prev) => Math.min(max, prev + 1))}
        style={[styles.roundBtn, { borderColor: c.line }]}
        accessibilityRole="button"
        accessibilityLabel={`Más ${label}`}
      >
        <Ionicons name="add" size={15} color={c.inkSoft} />
      </Pressable>
    </View>
  );
}

export default function EntrevistaScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  const { profile } = useProfile();
  const saved = profile?.nutriInterview;

  const [dietTags, setDietTags] = useState<DietTag[]>(saved?.dietTags ?? []);
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>(saved?.favoriteFoods ?? []);
  const [avoidFoods, setAvoidFoods] = useState<string[]>(saved?.avoidFoods ?? []);
  const [allergies, setAllergies] = useState<string[]>(saved?.allergies ?? []);
  const [legumbres, setLegumbres] = useState(saved?.weeklyWishes?.legumbres ?? 0);
  const [vegetariano, setVegetariano] = useState(saved?.weeklyWishes?.vegetariano ?? 0);
  const [pescado, setPescado] = useState(saved?.weeklyWishes?.pescado ?? 0);
  const [variety, setVariety] = useState<'variedad' | 'repetir'>(saved?.varietyPreference ?? 'variedad');
  const [maxRepeats, setMaxRepeats] = useState(saved?.maxRepeatsPerRecipe ?? 3);
  const [quickWeekdays, setQuickWeekdays] = useState(saved?.quickWeekdays ?? false);
  const [freeMeals, setFreeMeals] = useState(saved?.freeMealsPerWeek ?? 0);
  const [recipeSource, setRecipeSource] = useState<'mias' | 'todas'>(saved?.recipeSource ?? 'todas');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      const interview: NutriInterview = {
        dietTags,
        favoriteFoods,
        avoidFoods,
        allergies,
        weeklyWishes: {
          ...(legumbres > 0 ? { legumbres } : {}),
          ...(vegetariano > 0 ? { vegetariano } : {}),
          ...(pescado > 0 ? { pescado } : {}),
        },
        varietyPreference: variety,
        ...(variety === 'repetir' ? { maxRepeatsPerRecipe: maxRepeats } : {}),
        quickWeekdays,
        ...(freeMeals > 0 ? { freeMealsPerWeek: freeMeals } : {}),
        recipeSource,
        updatedAt: new Date().toISOString(),
      };
      await saveNutriInterview(user.uid, interview);
      router.back();
    } catch {
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  };

  const toggleDiet = (d: DietTag) =>
    setDietTags((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  /**
   * La entrevista, un bloque por pantalla y con Chefie contándola.
   *
   * Era un scroll único con nueve secciones seguidas: se rellenaba, pero se
   * leía como un formulario de gestoría y no se entendía POR QUÉ se preguntaba
   * cada cosa. Troceada, cada bloque viene con su explicación en la voz de
   * Chefie, que es donde se justifica solo.
   */
  const steps: { key: string; pose: ChefiePose; says: string; label: string; body: React.ReactNode }[] = [
    {
      key: 'dieta',
      pose: 'explain',
      label: 'TU DIETA',
      says: 'Empecemos por lo básico: ¿sigues alguna dieta en concreto? Si no, deja «Sin preferencia» y seguimos.',
      body: (
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setDietTags([])}
            style={[
              styles.chip,
              {
                borderColor: dietTags.length === 0 ? c.terra : c.line,
                backgroundColor: dietTags.length === 0 ? c.terraSoft : c.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: dietTags.length === 0 }}
          >
            <Text style={{ fontSize: 12, color: c.ink, fontFamily: Fonts.sans }}>Sin preferencia</Text>
          </Pressable>
          {DIET_TAGS.map((d) => {
            const on = dietTags.includes(d.value as DietTag);
            return (
              <Pressable
                key={d.value}
                onPress={() => toggleDiet(d.value as DietTag)}
                style={[styles.chip, { borderColor: on ? c.sage : c.line, backgroundColor: on ? c.sageSoft : c.surface }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={{ fontSize: 12, color: c.ink, fontFamily: Fonts.sans }}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ),
    },
    {
      key: 'encanta',
      pose: 'thumbsup',
      label: 'LO QUE TE ENCANTA',
      says: 'Dime platos o alimentos que te encanten y los sacaré a menudo. Con unos pocos me vale.',
      body: (
        <ChipsField
          label="LO QUE TE ENCANTA"
          values={favoriteFoods}
          onChange={setFavoriteFoods}
          placeholder="ej. salmón, lentejas…"
        />
      ),
    },
    {
      key: 'evitar',
      pose: 'shrug',
      label: 'LO QUE PREFIERES EVITAR',
      says: 'Y lo que no te apetece ver. Esto no es una alergia: si algún día me lo pides tú, te lo pongo igual.',
      body: (
        <ChipsField
          label="LO QUE PREFIERES EVITAR"
          values={avoidFoods}
          onChange={setAvoidFoods}
          placeholder="ej. brócoli, hígado…"
        />
      ),
    },
    {
      key: 'alergias',
      pose: 'point',
      label: 'ALERGIAS E INTOLERANCIAS',
      says: 'Esto va en serio: lo que pongas aquí no aparecerá nunca en nada que te proponga. Ni rastro, ni por error.',
      body: (
        <ChipsField
          label="ALERGIAS E INTOLERANCIAS"
          values={allergies}
          onChange={setAllergies}
          placeholder="ej. frutos secos, lactosa…"
          tone="sage"
        />
      ),
    },
    {
      key: 'semanal',
      pose: 'whisk',
      label: 'CADA SEMANA QUIERO AL MENOS…',
      says: '¿Quieres asegurarte un mínimo de algo cada semana? Déjalo a cero si te da igual y lo reparto yo.',
      body: (
        <View style={{ gap: 6 }}>
          <Stepper label="Comidas de legumbres" value={legumbres} onChange={setLegumbres} min={0} max={7} />
          <Stepper label="Comidas vegetarianas" value={vegetariano} onChange={setVegetariano} min={0} max={7} />
          <Stepper label="Comidas de pescado" value={pescado} onChange={setPescado} min={0} max={7} />
        </View>
      ),
    },
    {
      key: 'recetas',
      pose: 'serve',
      label: 'CON QUÉ RECETAS TE PLANIFICO',
      says: '¿Tiro solo de tus recetas, o también del recetario de Nutrilp? Con los dos hay bastante más variedad.',
      body: (
        <View style={{ gap: 6 }}>
          {(
            [
              ['todas', 'Las mías y las de Nutrilp', 'Más variedad: tiro también del recetario de Nutrilp.'],
              ['mias', 'Solo mis recetas', 'Uso únicamente las que tú has guardado.'],
            ] as const
          ).map(([v, title, desc]) => (
            <Pressable
              key={v}
              onPress={() => setRecipeSource(v)}
              style={[
                styles.optionWide,
                {
                  borderColor: recipeSource === v ? c.terra : c.line,
                  backgroundColor: recipeSource === v ? c.terraSoft : c.surface,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: recipeSource === v }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }}>{title}</Text>
                <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{desc}</Text>
              </View>
              {recipeSource === v ? <Ionicons name="checkmark-circle" size={18} color={c.terra} /> : null}
            </Pressable>
          ))}
          {recipeSource === 'mias' ? (
            <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16 }}>
              Ojo: si tienes pocas recetas guardadas, me quedaré sin con qué llenar la semana.
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      key: 'variedad',
      pose: 'idle',
      label: 'VARIEDAD',
      says: '¿Prefieres no repetir plato, o cocinas en tandas y te viene bien comer lo mismo un par de veces?',
      body: (
        <View style={{ gap: 6 }}>
          {(
            [
              ['variedad', 'Máxima variedad', 'Que casi no se repitan los platos.'],
              ['repetir', 'No me importa repetir', 'Cocino en tandas y reaprovecho (batch cooking).'],
            ] as const
          ).map(([v, title, desc]) => (
            <Pressable
              key={v}
              onPress={() => setVariety(v)}
              style={[
                styles.optionWide,
                {
                  borderColor: variety === v ? c.terra : c.line,
                  backgroundColor: variety === v ? c.terraSoft : c.surface,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: variety === v }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }}>{title}</Text>
                <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{desc}</Text>
              </View>
              {variety === v ? <Ionicons name="checkmark-circle" size={18} color={c.terra} /> : null}
            </Pressable>
          ))}
          {variety === 'repetir' ? (
            <Stepper
              label="Veces que puede repetirse un plato"
              value={maxRepeats}
              onChange={setMaxRepeats}
              min={2}
              max={7}
            />
          ) : null}
        </View>
      ),
    },
    {
      key: 'semana',
      pose: 'thinking',
      label: 'ENTRE SEMANA',
      says: 'De lunes a viernes suele haber menos tiempo. ¿Te tiro de recetas rápidas?',
      body: (
        <Pressable
          onPress={() => setQuickWeekdays((q) => !q)}
          style={[
            styles.optionWide,
            { borderColor: quickWeekdays ? c.terra : c.line, backgroundColor: quickWeekdays ? c.terraSoft : c.surface },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: quickWeekdays }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink, fontFamily: Fonts.sans }}>
              Prefiero recetas rápidas de lunes a viernes
            </Text>
            <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>Menos de 20 minutos.</Text>
          </View>
          {quickWeekdays ? <Ionicons name="checkmark-circle" size={18} color={c.terra} /> : null}
        </Pressable>
      ),
    },
    {
      key: 'libres',
      pose: 'celebrate',
      label: 'COMIDAS LIBRES',
      says: 'Y lo último: las comidas que harás fuera del plan. Una cena con amigos, un capricho. Te dejo hueco en la semana contando con ellas.',
      body: (
        <View style={{ gap: 8 }}>
          <Stepper label="Comidas libres por semana" value={freeMeals} onChange={setFreeMeals} min={0} max={3} />
          {/* Que quede claro que la reserva es una estimación, no una promesa,
              y que pasarse tampoco es grave: es el punto entero de la función. */}
          {freeMeals > 0 ? (
            <View style={[styles.noteBox, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 18 }}>
                Calculo unas 1.200 kcal por comida fuera y te reservo la diferencia con la que te saltas. Pero no es
                lo mismo una pizza mediana que una familiar con pan de ajo: si te pasas bastante, el plan seguirá
                siendo útil, solo que menos exacto. Y no pasa nada, que para eso están.
              </Text>
            </View>
          ) : null}
        </View>
      ),
    },
  ];

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (stepIndex === 0 ? router.back() : setStepIndex((s) => s - 1))}
          style={[styles.iconBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel={stepIndex === 0 ? 'Volver' : 'Paso anterior'}
        >
          <Ionicons name="arrow-back" size={17} color={c.inkSoft} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>La entrevista</Text>
          <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans }}>
            {step.label} · {stepIndex + 1} de {steps.length}
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: c.line }]}>
        <View
          style={[styles.progressFill, { backgroundColor: c.terra, width: `${((stepIndex + 1) / steps.length) * 100}%` }]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.chefieRow}>
          <ChefieMascot pose={step.pose} size={78} />
          <View style={[styles.bubble, { borderColor: c.line, backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 13, color: c.ink, fontFamily: Fonts.sans, lineHeight: 19 }}>{step.says}</Text>
          </View>
        </View>

        {step.body}

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: c.line }]}>
        {stepIndex > 0 ? (
          <Pressable
            onPress={() => setStepIndex((s) => s - 1)}
            style={[styles.navBtn, { borderWidth: 1.5, borderColor: c.line }]}
            accessibilityRole="button"
            accessibilityLabel="Atrás"
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.inkSoft, fontFamily: Fonts.sans }}>Atrás</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => (isLast ? handleSave() : setStepIndex((s) => s + 1))}
          disabled={saving}
          style={[styles.navBtn, { backgroundColor: c.terra, flexDirection: 'row', gap: 6 }, saving && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Guardar la entrevista' : 'Siguiente'}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF', fontFamily: Fonts.sans }}>
            {isLast ? (saving ? 'Guardando…' : 'Guardar') : 'Siguiente'}
          </Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={14} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  iconBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, gap: 9 },
  label: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, marginTop: 8 },
  input: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  addBtn: { width: 44, borderWidth: 1.5, borderRadius: Radii.card, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.2,
    borderRadius: Radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  optionWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  roundBtn: { width: 28, height: 28, borderWidth: 1.2, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  progressTrack: { height: 3, marginHorizontal: 18, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: 3, borderRadius: 2 },
  chefieRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, marginBottom: 4 },
  bubble: { flex: 1, borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 11 },
  noteBox: { borderWidth: 1.2, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { borderRadius: Radii.card, paddingHorizontal: 18, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
});
