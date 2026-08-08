import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot } from '@/components/chefie-mascot';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { firestore } from '@/firebase';
import { generateRecipe, interviewForAi } from '@/firebase/ai-client';
import { useCollection } from '@/firebase/firestore-hooks';
import { useProfile } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { setPendingRecipe } from '@/lib/generated-recipe-store';
import type { BaseIngredient } from '@/lib/types';

const EJEMPLOS = [
  'Algo con pollo y arroz para llevar al trabajo',
  'Una cena rápida de menos de 500 kcal',
  'Desayuno alto en proteína sin lácteos',
  'Comida de aprovechamiento con lo que tengo: calabacín, huevos y queso',
];

/**
 * Uno de los tres caminos de "Nueva receta" (`/receta-crear`): describes lo que
 * quieres y la IA la monta. Reusa el mismo endpoint y la misma pantalla de
 * revisión (`/receta-nueva`) que el asistente.
 */
export default function RecetaIaScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, activeGoalMacros } = useProfile();
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nombres del catálogo para que reutilice alimentos existentes en vez de
  // inventar variantes (mismo criterio que el asistente).
  const ingredientsRef = useMemo(() => collection(firestore, 'ingredients'), []);
  const { data: catalog } = useCollection<BaseIngredient>(ingredientsRef);
  const catalogNames = useMemo(() => (catalog ?? []).map((i) => i.name), [catalog]);

  const handleGenerate = async () => {
    const text = description.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const generated = await generateRecipe({
        description: text,
        nutritionalGoal: activeGoalMacros,
        diet: profile?.dietPreference,
        existingIngredients: catalogNames,
        interview: interviewForAi(profile?.nutriInterview),
      });
      if (!generated) {
        setError('No he conseguido montar esa receta. Prueba a describirla de otra forma.');
        return;
      }
      setPendingRecipe(generated);
      router.replace('/receta-nueva');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo ha fallado. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 25, color: c.ink, fontFamily: Fonts.serif }}>Que la monte Chefie</Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontFamily: Fonts.sans }}>
            Descríbela y te la monto con sus macros
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeBtn, { borderColor: c.line }]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={17} color={c.inkSoft} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          style={[
            styles.input,
            Shadows.card,
            { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans },
          ]}
          placeholder="Ej.: pollo al horno con verduras, para dos raciones…"
          placeholderTextColor={c.inkSoft}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!busy}
        />

        <Text style={[styles.miniLabel, { color: c.inkSoft, fontFamily: Fonts.sans }]}>O PRUEBA CON…</Text>
        {EJEMPLOS.map((e) => (
          <Pressable
            key={e}
            onPress={() => setDescription(e)}
            disabled={busy}
            style={[styles.example, { borderColor: c.line, backgroundColor: c.surface }]}
            accessibilityRole="button"
            accessibilityLabel={e}
          >
            <Ionicons name="sparkles-outline" size={13} color={c.sage} />
            <Text style={{ flex: 1, fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans }}>{e}</Text>
          </Pressable>
        ))}

        <Text style={{ fontSize: 11, color: c.inkSoft, fontFamily: Fonts.sans, lineHeight: 17, marginTop: 4 }}>
          Tendrá en cuenta tu objetivo y tu entrevista (gustos, alergias y dieta). Antes de guardarla la revisas: nada
          se añade a tus recetas sin que lo confirmes.
        </Text>

        {error ? <Text style={{ fontSize: 12.5, color: c.terra, fontFamily: Fonts.sans }}>{error}</Text> : null}

        {/* Chefie pensando mientras la IA monta la receta: da algo que mirar en
            la espera, que aquí es de varios segundos. */}
        {busy ? (
          <View style={{ alignItems: 'center', gap: 4, paddingTop: 6 }}>
            <ChefieMascot pose="thinking" size={76} />
            <Text style={{ fontSize: 12.5, color: c.inkSoft, fontFamily: Fonts.sans }}>Montando la receta…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          onPress={handleGenerate}
          disabled={busy || !description.trim()}
          style={[
            styles.cta,
            Shadows.card,
            { backgroundColor: c.terra },
            (busy || !description.trim()) && { opacity: 0.55 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Crear receta"
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="restaurant-outline" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: Fonts.sans }}>
                Crear receta
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingBottom: 12 },
  closeBtn: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 20, gap: 8 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    minHeight: 96,
  },
  miniLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginTop: 8 },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  footer: { paddingHorizontal: 18, paddingTop: 6 },
  cta: { flexDirection: 'row', gap: 7, borderRadius: Radii.card, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
});
