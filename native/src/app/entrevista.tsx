import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const c = useTheme();
  return (
    <View style={[styles.stepperRow, { borderColor: c.line, backgroundColor: c.surface }]}>
      <Text style={{ flex: 1, fontSize: 13, color: c.ink, fontFamily: Fonts.sans }}>{label}</Text>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
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
        onPress={() => onChange(Math.min(max, value + 1))}
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

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={17} color={c.inkSoft} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 21, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>La entrevista</Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Cuanto mejor te conozca, mejor te planifico
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>TU DIETA</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setDietTags([])}
            style={[
              styles.chip,
              { borderColor: dietTags.length === 0 ? c.terra : c.line, backgroundColor: dietTags.length === 0 ? c.terraSoft : c.surface },
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

        <ChipsField
          label="LO QUE TE ENCANTA"
          hint="Platos o alimentos que quieres ver a menudo en tu plan."
          values={favoriteFoods}
          onChange={setFavoriteFoods}
          placeholder="ej. salmón, lentejas…"
        />

        <ChipsField
          label="LO QUE PREFIERES EVITAR"
          hint="No te gustan. Los evitaré salvo que me los pidas expresamente."
          values={avoidFoods}
          onChange={setAvoidFoods}
          placeholder="ej. brócoli, hígado…"
        />

        <ChipsField
          label="ALERGIAS E INTOLERANCIAS"
          hint="Prohibición absoluta: nunca aparecerán en nada que te proponga."
          values={allergies}
          onChange={setAllergies}
          placeholder="ej. frutos secos, lactosa…"
          tone="sage"
        />

        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>CADA SEMANA QUIERO AL MENOS…</Text>
        <View style={{ gap: 6 }}>
          <Stepper label="Comidas de legumbres" value={legumbres} onChange={setLegumbres} min={0} max={7} />
          <Stepper label="Comidas vegetarianas" value={vegetariano} onChange={setVegetariano} min={0} max={7} />
          <Stepper label="Comidas de pescado" value={pescado} onChange={setPescado} min={0} max={7} />
        </View>

        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>CON QUÉ RECETAS TE PLANIFICO</Text>
        <View style={{ gap: 6 }}>
          {([
            ['todas', 'Las mías y las de Nutrilp', 'Más variedad: tiro también del recetario de Nutrilp.'],
            ['mias', 'Solo mis recetas', 'Uso únicamente las que tú has guardado.'],
          ] as const).map(([v, title, desc]) => (
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
          {/* Con pocas recetas propias, "solo las mías" deja la semana a medias:
              mejor avisar aquí que dejar que el autocompletado falle luego. */}
          {recipeSource === 'mias' ? (
            <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16 }}>
              Ojo: si tienes pocas recetas guardadas, me quedaré sin con qué llenar la semana.
            </Text>
          ) : null}
        </View>

        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>VARIEDAD</Text>
        <View style={{ gap: 6 }}>
          {([
            ['variedad', 'Máxima variedad', 'Que casi no se repitan los platos.'],
            ['repetir', 'No me importa repetir', 'Cocino en tandas y reaprovecho (batch cooking).'],
          ] as const).map(([v, title, desc]) => (
            <Pressable
              key={v}
              onPress={() => setVariety(v)}
              style={[
                styles.optionWide,
                { borderColor: variety === v ? c.terra : c.line, backgroundColor: variety === v ? c.terraSoft : c.surface },
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
            <Stepper label="Veces que puede repetirse un plato" value={maxRepeats} onChange={setMaxRepeats} min={2} max={7} />
          ) : null}
        </View>

        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>ENTRE SEMANA</Text>
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

        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>COMIDAS LIBRES</Text>
        <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 16 }}>
          Comidas a la semana que harás fuera del plan (una cena con amigos, un capricho). Cuento con ellas al
          planificarte: forman parte del plan, no son un fallo.
        </Text>
        <Stepper label="Comidas libres por semana" value={freeMeals} onChange={setFreeMeals} min={0} max={3} />

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.primaryBtn, { backgroundColor: c.terra }, saving && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Guardar entrevista"
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: Fonts.sans }}>
              Guardar entrevista
            </Text>
          )}
        </Pressable>
      </ScrollView>
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
  primaryBtn: { borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
});
