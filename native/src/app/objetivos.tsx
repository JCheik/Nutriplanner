import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { useAuthUser } from '@/firebase/auth-context';
import { saveActiveGoal, saveCalorieResult } from '@/firebase/profile-operations';
import { useProfile } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { ACTIVITY_LABELS, computeResult, GOAL_LABELS } from '@/lib/calorie-calc';
import type { CalculationResult, CalculatorInputs, GoalType } from '@/lib/types';

type ActivityLevel = CalculatorInputs['activityLevel'];

/**
 * Calculadora de objetivos (boceto 9 → pestaña Objetivos). Mismo flujo que la
 * web y misma fórmula (`calorie-calc.ts`): rellenas, **Calcular** enseña una
 * previsualización, y solo **Guardar y aplicar** escribe en Firestore. Nunca
 * se guarda al vuelo mientras tecleas.
 */
export default function ObjetivosScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  const { profile } = useProfile();

  const saved = profile?.calorieResult ?? null;
  const savedInputs = saved?.inputs;

  const [gender, setGender] = useState<'male' | 'female'>(savedInputs?.gender ?? 'male');
  const [age, setAge] = useState(savedInputs?.age ? String(savedInputs.age) : '');
  const [weight, setWeight] = useState(savedInputs?.weight ? String(savedInputs.weight) : '');
  const [height, setHeight] = useState(savedInputs?.height ? String(savedInputs.height) : '');
  const [activity, setActivity] = useState<ActivityLevel>(savedInputs?.activityLevel ?? 'moderate');
  const [goal, setGoal] = useState<GoalType>(profile?.activeGoalPreference ?? 'maintenance');

  const [preview, setPreview] = useState<CalculationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const nums = { age: Number(age), weight: Number(weight), height: Number(height) };
  const valid =
    Number.isFinite(nums.age) && nums.age > 0 &&
    Number.isFinite(nums.weight) && nums.weight > 0 &&
    Number.isFinite(nums.height) && nums.height > 0;

  const handleCalculate = () => {
    if (!valid) {
      setNotice('Rellena edad, peso y altura con números válidos.');
      return;
    }
    setNotice(null);
    setPreview(
      computeResult(
        { gender, age: nums.age, weight: nums.weight, height: nums.height, activityLevel: activity },
        saved?.custom
      )
    );
  };

  const handleSave = async () => {
    if (!user || !preview || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      await saveCalorieResult(user.uid, preview);
      await saveActiveGoal(user.uid, goal === 'custom' ? 'maintenance' : goal);
      router.back();
    } catch {
      setNotice('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  };

  const shown = preview ?? saved;
  const shownGoal = goal === 'custom' ? 'maintenance' : goal;
  const macros = shown ? shown[shownGoal] ?? shown.maintenance : null;

  const input = (
    label: string,
    value: string,
    setter: (v: string) => void,
    placeholder: string
  ) => (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
        value={value}
        onChangeText={(v) => {
          setter(v);
          setPreview(null); // cambiar datos invalida la previsualización
        }}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={c.inkSoft}
        accessibilityLabel={label}
      />
    </View>
  );

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
          <Text style={{ fontSize: 21, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>
            Objetivo diario
          </Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Fórmula de Mifflin-St Jeor
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>SEXO</Text>
        <View style={styles.row}>
          {(['male', 'female'] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => { setGender(g); setPreview(null); }}
              style={[
                styles.option,
                { borderColor: gender === g ? c.terra : c.line, backgroundColor: gender === g ? c.terraSoft : c.surface },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: gender === g }}
            >
              <Text style={{ fontSize: 13, color: gender === g ? c.ink : c.inkSoft, fontFamily: Fonts.sans, fontWeight: gender === g ? '700' : '400' }}>
                {g === 'male' ? 'Hombre' : 'Mujer'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          {input('EDAD', age, setAge, 'años')}
          {input('PESO (kg)', weight, setWeight, 'kg')}
          {input('ALTURA (cm)', height, setHeight, 'cm')}
        </View>

        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>NIVEL DE ACTIVIDAD</Text>
        <View style={{ gap: 6 }}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
            <Pressable
              key={a}
              onPress={() => { setActivity(a); setPreview(null); }}
              style={[
                styles.optionWide,
                { borderColor: activity === a ? c.terra : c.line, backgroundColor: activity === a ? c.terraSoft : c.surface },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: activity === a }}
            >
              <Text style={{ flex: 1, fontSize: 12.5, color: activity === a ? c.ink : c.inkSoft, fontFamily: Fonts.sans }}>
                {ACTIVITY_LABELS[a]}
              </Text>
              {activity === a ? <Ionicons name="checkmark-circle" size={17} color={c.terra} /> : null}
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>TU OBJETIVO</Text>
        <View style={styles.row}>
          {(['loss', 'maintenance', 'gain'] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => setGoal(g)}
              style={[
                styles.option,
                { borderColor: shownGoal === g ? c.terra : c.line, backgroundColor: shownGoal === g ? c.terraSoft : c.surface },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: shownGoal === g }}
            >
              <Text
                style={{ fontSize: 12, textAlign: 'center', color: shownGoal === g ? c.ink : c.inkSoft, fontFamily: Fonts.sans, fontWeight: shownGoal === g ? '700' : '400' }}
              >
                {GOAL_LABELS[g]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleCalculate}
          style={[styles.secondaryBtn, { borderColor: c.terra }]}
          accessibilityRole="button"
          accessibilityLabel="Calcular"
        >
          <Ionicons name="calculator-outline" size={16} color={c.terra} />
          <Text style={{ color: c.terra, fontWeight: '700', fontSize: 13.5, fontFamily: Fonts.sans }}>Calcular</Text>
        </Pressable>

        {macros ? (
          <View style={[styles.resultCard, { borderColor: c.terra, backgroundColor: c.terraSoft }]}>
            <Text style={[styles.label, { color: c.inkSoft, fontFamily: Fonts.sans }]}>
              {preview ? 'RESULTADO (SIN GUARDAR)' : 'OBJETIVO GUARDADO'}
            </Text>
            <Text style={{ fontSize: 27, fontWeight: '800', color: c.ink, fontFamily: Fonts.serif }}>
              {Math.round(macros.calories)}
              <Text style={{ fontSize: 13, fontWeight: '400', color: c.inkSoft, fontFamily: Fonts.sans }}> kcal/día</Text>
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 }}>
              {[
                [`${Math.round(macros.protein)} g`, 'Proteína'],
                [`${Math.round(macros.carbs)} g`, 'Carbohidr.'],
                [`${Math.round(macros.fat)} g`, 'Grasas'],
              ].map(([v, l]) => (
                <View key={l} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: Fonts.serif }}>{v}</Text>
                  <Text style={{ fontSize: 10.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {notice ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{notice}</Text> : null}

        <Pressable
          onPress={handleSave}
          disabled={!preview || saving}
          style={[styles.primaryBtn, { backgroundColor: c.terra }, (!preview || saving) && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Guardar y aplicar"
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: Fonts.sans }}>
              Guardar y aplicar
            </Text>
          )}
        </Pressable>
        {!preview ? (
          <Text style={{ fontSize: 11.5, color: c.inkSoft, fontFamily: Fonts.sans, textAlign: 'center' }}>
            Pulsa &quot;Calcular&quot; para ver el resultado antes de guardarlo.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  iconBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, gap: 8 },
  label: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, borderWidth: 1.5, borderRadius: Radii.card, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  optionWide: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10 },
  input: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  resultCard: { borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 14, paddingVertical: 12, marginTop: 6 },
  secondaryBtn: {
    flexDirection: 'row',
    gap: 7,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtn: { borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
});
