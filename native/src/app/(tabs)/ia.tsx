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
import { addRecipeToMeal, clearDay, clearMeal, clearWeek, removeRecipeFromMeal } from '@/firebase/plan-operations';
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
import { failJob, finishJob, isJobRunning, startJob, useBackgroundJob } from '@/lib/background-job';
import { findInPlan, splitToRemove } from '@/lib/plan-search';
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
  /** Cerrojo síncrono de `send`. Ver el comentario de allí. */
  const busyRef = useRef(false);
  /**
   * Montar la semana sigue en marcha DESPUÉS de que `send` termine (corre en
   * segundo plano). Mientras dure, el atajo se queda apagado: si no, vuelve a
   * habilitarse a los dos segundos y el usuario lo pulsa otra vez pensando que
   * no había pasado nada.
   */
  const job = useBackgroundJob();
  const jobWorking = job?.status === 'working';

  const interview = interviewForAi(profile?.nutriInterview);
  const append = (m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  /**
   * Rellenar huecos. `opts.plan` sirve para encadenarlo justo después de haber
   * quitado comidas: el `weekPlan` del hook aún trae las viejas (Firestore no
   * ha devuelto el cambio todavía), así que se le pasa el plan ya recortado.
   */
  const runAutocomplete = async (opts?: {
    plan?: typeof weekPlan;
    excludeRecipeIds?: string[];
    reply?: string;
    jobLabel?: string;
  }): Promise<string> => {
    if (!user) return 'Inicia sesión para esto.';
    if (!interview) {
      // La entrevista se rellena DENTRO de la app desde 2026-07-25: se abre en
      // vez de mandar a la web, como decía este mensaje hasta la auditoría.
      router.push('/entrevista');
      return 'Antes de autocompletar necesito conocerte: te abro la entrevista para que me cuentes tus gustos y tus alergias. Con eso el plan sale mucho mejor.';
    }
    // Lo que eligió en la entrevista: solo su recetario, o también el de
    // Nutrilp. Sin el campo (entrevistas viejas) se usan los dos, que es como
    // se comportaba antes.
    const soloMias = profile?.nutriInterview?.recipeSource === 'mias';
    const availableRecipes = soloMias ? userRecipes : [...userRecipes, ...globalRecipes];
    if (availableRecipes.length === 0) {
      return soloMias
        ? 'En la entrevista me pediste planificar solo con tus recetas, y aún no tienes ninguna guardada. Créate alguna, o cambia esa opción para que tire también del recetario de Nutrilp.'
        : 'No tengo recetas con las que planificar todavía.';
    }
    if (isJobRunning()) return 'Estoy con otra cosa ahora mismo. Dame un momento y te la monto.';

    // Montar la semana entera tarda, así que se manda al fondo y se responde ya:
    // el usuario puede irse a Recetas o a la Compra mientras tanto, y `ChefieBubble`
    // le avisa. Sin await a propósito — esta función devuelve el mensaje del chat.
    startJob(opts?.jobLabel ?? 'Montando tu semana…');
    void (async () => {
      try {
        const { placements, unfilled } = await autocompleteWeek({
          weekPlan: opts?.plan ?? weekPlan,
          availableRecipes,
          activeGoal: activeGoalMacros,
          preferences: {
            allowRepetition: interview.varietyPreference === 'variedad' ? 'no_repeat' : 'max_n',
            maxRepetitions: interview.maxRepeatsPerRecipe ?? 3,
            priority: activeGoalMacros ? 'goal' : 'protein',
            dietaryRestrictions: '',
            goalMarginPercent: 15,
            interview,
            ...(opts?.excludeRecipeIds?.length ? { excludeRecipeIds: opts.excludeRecipeIds } : {}),
          },
        });
        await Promise.all(
          placements.map((p) => {
            const recipe = availableRecipes.find((r) => r.id === p.recipeId);
            return recipe ? addRecipeToMeal(user.uid, p.day, p.mealId, recipe, p.servings) : Promise.resolve();
          })
        );
        const n = placements.length;
        if (n === 0) {
          failJob('No pude cuadrar la semana', 'Nada encajaba con tu objetivo. Prueba a ajustarlo o añade recetas.');
          return;
        }
        finishJob(
          `Semana lista: ${n} comida${n === 1 ? '' : 's'}`,
          unfilled.length ? `Quedan ${unfilled.length} hueco(s). Toca para verla.` : 'Toca para verla.',
          { pathname: '/' }
        );
      } catch (e) {
        failJob('No pude autocompletar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
      }
    })();

    return opts?.reply ?? 'Voy con ello. Sigue a lo tuyo, que te aviso desde la esquina en cuanto la tenga.';
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
      /**
       * "No quiero tanto atún": quita las comidas que lo lleven y rellena los
       * huecos de una, sin preguntar cuál cambiar. Es lo que el usuario
       * esperaba y lo que antes acababa en un interrogatorio hueco por hueco.
       */
      case 'swap_out_of_plan': {
        const query = String(args.query ?? '').trim();
        if (query.length < 2) return '¿Qué te quito exactamente?';
        const matches = findInPlan(weekPlan, query);
        if (matches.length === 0) return `Pues no veo nada con "${query}" en tu semana. ¿Lo llamas de otra forma?`;

        const keepAtMost = Math.max(0, Math.trunc(Number(args.keepAtMost ?? 0)) || 0);
        const { remove } = splitToRemove(matches, keepAtMost);
        if (remove.length === 0) {
          return `Ya tienes solo ${matches.length} con ${query}, así que lo dejo como está.`;
        }

        await Promise.all(
          remove.map((m) => removeRecipeFromMeal(user.uid, m.day, m.mealId, m.instanceId))
        );

        // Plan ya sin ellas, para no esperar a que Firestore lo devuelva.
        const removedIds = new Set(remove.map((m) => m.instanceId));
        const trimmed = weekPlan.map((d) => ({
          ...d,
          meals: d.meals.map((m) => ({ ...m, recipes: m.recipes.filter((r) => !removedIds.has(r.instanceId)) })),
        }));

        const n = remove.length;
        const quitadas = `${n} comida${n === 1 ? '' : 's'} con ${query}`;
        return runAutocomplete({
          plan: trimmed,
          // Se vetan las recetas quitadas para que el relleno no vuelva a
          // ponerlas: sin esto, el autocompletado repone justo lo que sobraba.
          excludeRecipeIds: [...new Set(remove.map((m) => m.recipeId))],
          jobLabel: `Cambiando ${quitadas}…`,
          reply:
            keepAtMost > 0
              ? `Hecho: te dejo ${keepAtMost} y cambio ${quitadas}. Te aviso cuando esté.`
              : `Hecho: fuera ${quitadas}. Relleno esos huecos y te aviso.`,
        });
      }
      case 'set_goal':
        // La calculadora vive en la app desde 2026-07-25. No se toca el objetivo
        // por mi cuenta: la fórmula necesita peso, altura, edad y actividad, así
        // que se abre la pantalla y lo confirma el usuario (Calcular → Guardar).
        router.push('/objetivos');
        return 'Te abro la calculadora de objetivos: rellena tus datos, dale a Calcular y luego a Guardar y aplicar.';
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
    // El cerrojo es la REF, no el estado: `busy` viene de la clausura del
    // render, así que dos toques rápidos en el mismo tick lo ven a false los
    // dos y salían dos peticiones a la IA. Le pasó al usuario autocompletando
    // la semana: se le lanzó dos veces.
    if (!text || busyRef.current) return;
    busyRef.current = true;
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
      busyRef.current = false;
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
          disabled={busy || jobWorking}
          style={[
            styles.quickChip,
            { borderColor: c.sage, backgroundColor: c.sageSoft },
            // Apagado a la vista, no solo inerte: antes seguía pareciendo
            // pulsable y se tocaba otra vez.
            (busy || jobWorking) && { opacity: 0.45 },
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || jobWorking }}
        >
          <Text style={{ color: c.ink, fontSize: 12, fontWeight: '600', fontFamily: Fonts.sans }}>
            {jobWorking ? '✦ Montando la semana…' : '✦ Autocompletar semana'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/nevera')}
          disabled={busy}
          style={[styles.quickChip, { borderColor: c.line, backgroundColor: c.surface }, busy && { opacity: 0.45 }]}
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
