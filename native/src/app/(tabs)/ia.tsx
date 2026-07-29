import { useRouter } from 'expo-router';
import { collection } from 'firebase/firestore';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefieMascot } from '@/components/chefie-mascot';
import { PaperTexture } from '@/components/paper-texture';
import { ScreenTitle } from '@/components/screen-scaffold';
import { Fonts, Radii } from '@/constants/theme';
import { firestore } from '@/firebase';
import { askAssistant, autocompleteWeek, generateRecipe, interviewForAi } from '@/firebase/ai-client';
import { useAuthUser } from '@/firebase/auth-context';
import { useCollection } from '@/firebase/firestore-hooks';
import { addRecipeToMeal, clearDay, clearMeal, clearWeek } from '@/firebase/plan-operations';
import { useProfile, useRecipes, useWeekPlan } from '@/hooks/use-nutrilp-data';
import { useTheme } from '@/hooks/use-theme';
import { setPendingRecipe } from '@/lib/generated-recipe-store';
import type { BaseIngredient } from '@/lib/types';
import {
  buildContext,
  confirmationPrompt,
  DESTRUCTIVE_ACTIONS,
  resolveDay,
  resolveMeal,
  resolveRecipe,
} from '@/lib/assistant';
import { mealCalorieRatio, suggestedServings } from '@/lib/serving-utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}
interface Pending {
  action: string;
  args: Record<string, unknown>;
}

/**
 * Asistente IA (boceto 4). Habla con `/api/ai/assistant` (misma lógica que la
 * web) y ejecuta la acción devuelta contra Firestore desde el cliente. Las
 * acciones destructivas piden confirmación. Crear receta y foto de nevera
 * llegan después (F3+).
 */
export default function IaScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthUser();
  const { weekPlan } = useWeekPlan();
  const { userRecipes, globalRecipes } = useRecipes();
  const { profile, activeGoalMacros } = useProfile();

  // Solo se suscribe al catálogo para poder pasarle los nombres al generador
  // de recetas (evita que invente duplicados del mismo alimento).
  const ingredientsRef = useMemo(() => collection(firestore, 'ingredients'), []);
  const { data: catalog } = useCollection<BaseIngredient>(ingredientsRef);
  const catalogNames = useMemo(() => (catalog ?? []).map((i) => i.name), [catalog]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const interview = interviewForAi(profile?.nutriInterview);
  const append = (m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const runAutocomplete = async (): Promise<string> => {
    if (!user) return 'Inicia sesión para esto.';
    if (!interview) {
      return 'Antes de autocompletar, cuéntame tus gustos y alergias en la entrevista (por ahora en la web, Mi Laboratorio) — así el plan será mucho mejor.';
    }
    const availableRecipes = [...userRecipes, ...globalRecipes];
    const { placements, unfilled } = await autocompleteWeek({
      weekPlan,
      availableRecipes,
      activeGoal: activeGoalMacros,
      preferences: {
        allowRepetition: interview.varietyPreference === 'variedad' ? 'no_repeat' : 'max_n',
        maxRepetitions: interview.maxRepeatsPerRecipe ?? 3,
        priority: activeGoalMacros ? 'goal' : 'protein',
        dietaryRestrictions: '',
        goalMarginPercent: 15,
        interview,
      },
    });
    await Promise.all(
      placements.map((p) => {
        const recipe = availableRecipes.find((r) => r.id === p.recipeId);
        return recipe ? addRecipeToMeal(user.uid, p.day, p.mealId, recipe, p.servings) : Promise.resolve();
      })
    );
    const n = placements.length;
    if (n === 0) return 'No he podido rellenar huecos que cuadren con tu objetivo. Prueba a ajustarlo o añade recetas.';
    return `Listo, he colocado ${n} comida${n === 1 ? '' : 's'}${unfilled.length ? `; ${unfilled.length} hueco(s) sin cubrir` : ''}.`;
  };

  // Applies a validated action against Firestore, returning the reply to show.
  const runAction = async (action: string, args: Record<string, unknown>): Promise<string> => {
    if (!user) return 'Inicia sesión para esto.';
    switch (action) {
      case 'add_recipe_to_meal': {
        const dayPlan = resolveDay(weekPlan, String(args.day));
        if (!dayPlan) return `No veo ningún "${args.day}" en tu semana.`;
        const meal = resolveMeal(dayPlan, String(args.meal));
        if (!meal) return `No encuentro "${args.meal}" en ${dayPlan.day}.`;
        const recipe = resolveRecipe(userRecipes, globalRecipes, String(args.recipe));
        if (!recipe) return `No tengo ninguna receta que se llame "${args.recipe}".`;
        const target = activeGoalMacros ? activeGoalMacros.calories * mealCalorieRatio(meal.mealTypes ?? []) : null;
        await addRecipeToMeal(user.uid, dayPlan.day, meal.id, recipe, suggestedServings(recipe, target));
        return `¡Hecho! ${recipe.name} para ${meal.title} del ${dayPlan.day}.`;
      }
      case 'clear_meal': {
        const dayPlan = resolveDay(weekPlan, String(args.day));
        if (!dayPlan) return `No veo ningún "${args.day}" en tu semana.`;
        const meal = resolveMeal(dayPlan, String(args.meal));
        if (!meal) return `No encuentro "${args.meal}" en ${dayPlan.day}.`;
        await clearMeal(user.uid, dayPlan.day, meal.id);
        return `Listo, ${meal.title} del ${dayPlan.day} otra vez en blanco.`;
      }
      case 'clear_day': {
        const dayPlan = resolveDay(weekPlan, String(args.day));
        if (!dayPlan) return `No veo ningún "${args.day}" en tu semana.`;
        await clearDay(user.uid, dayPlan.day);
        return `Venga, ${dayPlan.day} libre del todo.`;
      }
      case 'clear_week': {
        await clearWeek(user.uid);
        return 'Hecho, semana vacía. Empezamos de cero.';
      }
      case 'autocomplete_week':
        return runAutocomplete();
      case 'set_goal':
        return 'Ese cambio de objetivo aún se hace desde la web (calculadora de Mi Laboratorio). En la app llega pronto.';
      case 'create_recipe': {
        const generated = await generateRecipe({
          description: String(args.description ?? ''),
          nutritionalGoal: activeGoalMacros,
          diet: profile?.dietPreference,
          // Nombres del catálogo para que reutilice los existentes en vez de
          // inventar variantes ("claras de huevo" vs "clara de huevo").
          existingIngredients: catalogNames,
          interview,
        });
        if (!generated) return 'No he conseguido montar esa receta. Prueba a describirla de otra forma.';
        setPendingRecipe(generated);
        router.push('/receta-nueva');
        return `Te he montado "${generated.name}". Échale un ojo y guárdala si te convence.`;
      }
      default:
        return 'Uy, esa no la pillo. ¿Me lo dices de otra forma?';
    }
  };

  const dispatch = async (action: string, args: Record<string, unknown>) => {
    setBusy(true);
    try {
      append({ role: 'assistant', text: await runAction(action, args) });
    } catch (e) {
      append({ role: 'assistant', text: e instanceof Error ? e.message : 'Algo ha fallado. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput('');
    setPending(null);
    append({ role: 'user', text });
    setBusy(true);
    try {
      const res = await askAssistant({
        message: text,
        context: buildContext(weekPlan, userRecipes, globalRecipes),
        interview,
      });
      if (res.reply) append({ role: 'assistant', text: res.reply });
      if (res.action) {
        const args = res.args ?? {};
        if (DESTRUCTIVE_ACTIONS.has(res.action)) {
          setPending({ action: res.action, args });
          append({ role: 'assistant', text: confirmationPrompt(res.action, args) });
        } else {
          await dispatch(res.action, args);
        }
      }
    } catch (e) {
      append({ role: 'assistant', text: e instanceof Error ? e.message : 'La IA no responde. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    await dispatch(p.action, p.args);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + 10 }}
    >
      <PaperTexture />
      <View style={styles.header}>
        <ScreenTitle compact eyebrow="Chefie, tu ayudante" title="Asistente" />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.chat}>
        {messages.length === 0 ? (
          // Chefie en grande da la bienvenida: el usuario quería verlo también
          // fuera del tutorial, y aquí es donde "habla" de verdad.
          <View style={styles.welcome}>
            <ChefieMascot pose="explain" size={104} />
            <View style={[styles.bubble, styles.assistantBubble, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Text style={{ fontSize: 13.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 20 }}>
                ¡Hola! Soy Chefie. Puedo planificar días, añadir o quitar recetas y autocompletarte la semana. ¿Qué
                necesitas?
              </Text>
            </View>
          </View>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <View
                key={i}
                style={[styles.bubble, styles.userBubble, { backgroundColor: c.terraSoft, borderColor: c.terraSoft }]}
              >
                <Text style={{ fontSize: 13.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 20 }}>{m.text}</Text>
              </View>
            ) : (
              // Chefie asoma junto a cada respuesta suya (solo en la primera de
              // una tanda, para no repetirlo en cada burbuja seguida).
              <View key={i} style={styles.assistantRow}>
                <View style={{ width: 30 }}>
                  {messages[i - 1]?.role !== 'assistant' ? <ChefieMascot pose="idle" size={30} /> : null}
                </View>
                <View
                  style={[styles.bubble, styles.assistantBubble, { borderColor: c.line, backgroundColor: c.surface }]}
                >
                  <Text style={{ fontSize: 13.5, color: c.ink, fontFamily: Fonts.sans, lineHeight: 20 }}>{m.text}</Text>
                </View>
              </View>
            )
          )
        )}

        {pending ? (
          <View style={styles.chips}>
            <Pressable
              onPress={confirmPending}
              disabled={busy}
              style={[styles.chip, { backgroundColor: c.terra }]}
              accessibilityRole="button"
            >
              <Text style={{ color: '#FFF', fontSize: 12.5, fontWeight: '700', fontFamily: Fonts.sans }}>Sí, hazlo</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setPending(null);
                append({ role: 'assistant', text: 'Vale, lo dejo como está.' });
              }}
              disabled={busy}
              style={[styles.chip, { borderWidth: 1.5, borderColor: c.line }]}
              accessibilityRole="button"
            >
              <Text style={{ color: c.inkSoft, fontSize: 12.5, fontWeight: '700', fontFamily: Fonts.sans }}>No</Text>
            </Pressable>
          </View>
        ) : null}

        {busy ? <ActivityIndicator color={c.terra} style={{ marginTop: 8 }} /> : null}
      </ScrollView>

      <View style={styles.quickRow}>
        <Pressable
          onPress={() => send('autocompleta la semana')}
          disabled={busy}
          style={[styles.quickChip, { borderColor: c.sage, backgroundColor: c.sageSoft }]}
          accessibilityRole="button"
        >
          <Text style={{ color: c.ink, fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans }}>
            ✦ Autocompletar semana
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/nevera')}
          disabled={busy}
          style={[styles.quickChip, { borderColor: c.line, backgroundColor: c.surface }]}
          accessibilityRole="button"
        >
          <Text style={{ color: c.ink, fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans }}>
            📷 Foto de mi nevera
          </Text>
        </Pressable>
      </View>

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink, fontFamily: Fonts.sans }]}
          placeholder="Escribe una instrucción…"
          placeholderTextColor={c.inkSoft}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          editable={!busy}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => send(input)}
          disabled={busy || !input.trim()}
          style={[styles.sendBtn, { backgroundColor: c.terra }, (busy || !input.trim()) && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
        >
          <Text style={{ color: '#FFF', fontSize: 17, lineHeight: 19 }}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 8 },
  chat: { paddingHorizontal: 18, paddingBottom: 12, gap: 8 },
  welcome: { alignItems: 'center', gap: 6, paddingTop: 6 },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubble: { maxWidth: '88%', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  chips: { flexDirection: 'row', gap: 8, alignSelf: 'flex-start' },
  chip: { borderRadius: Radii.pill, paddingHorizontal: 14, paddingVertical: 7 },
  quickRow: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 8, gap: 8 },
  quickChip: { borderWidth: 1.5, borderRadius: Radii.pill, paddingHorizontal: 12, paddingVertical: 7 },
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 4 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: Radii.card, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  sendBtn: { width: 44, borderRadius: Radii.card, alignItems: 'center', justifyContent: 'center' },
});
