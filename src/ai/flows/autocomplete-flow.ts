'use server';

import { ai, GEMINI_MODEL_BULK } from '@/ai/genkit';
import { z } from 'zod';
import { DIET_TAG_ENUM, type WeekPlan, type GoalMacros, type Recipe, type MealCategory, type DietTag } from '@/lib/types';
import { suggestedServings, mealCalorieRatio } from '@/lib/serving-utils';
import { NutriInterviewPromptSchema, type InterviewForPrompt } from '@/ai/prompt-fragments';
import { expandAllergens, recipeHasAllergen } from '@/lib/allergens';

const AutocompletePreferencesSchema = z.object({
  // 'max_twice' is the legacy value (fixed limit of 2); 'max_n' uses the
  // user-chosen `maxRepetitions`. Both kept so cached PWA clients keep working.
  allowRepetition: z.enum(['no_repeat', 'max_n', 'max_twice', 'free']),
  maxRepetitions: z.number().int().min(2).max(7).optional(),
  priority: z.enum(['goal', 'protein', 'calories']),
  dietaryRestrictions: z.string().optional(),
  goalMarginPercent: z.number().optional(),
  diet: z.array(z.enum(DIET_TAG_ENUM)).optional(),
  // Answers from the "entrevista" questionnaire (Mi Laboratorio). Optional so
  // callers that predate it (mobile, cached PWA clients) keep working. Shared
  // schema with the assistant + recipe-generation flows.
  interview: NutriInterviewPromptSchema.optional(),
  // Recipe names used in recently saved weeks, so consecutive plans don't come
  // out identical ("siempre me da el mismo plan").
  recentRecipeNames: z.array(z.string()).optional(),
  /**
   * Recetas que NO se pueden colocar en esta pasada. Lo usa el asistente al
   * rellenar los huecos que acaba de vaciar por un "no quiero tanto atún": sin
   * esto, el autocompletado volvería a poner justo lo que se acaba de quitar.
   */
  excludeRecipeIds: z.array(z.string()).optional(),
});

const AutocompleteInputSchema = z.object({
  weekPlan: z.any(),
  availableRecipes: z.any(),
  activeGoal: z.any().nullable(),
  preferences: AutocompletePreferencesSchema,
});

// What the LLM returns (just the assignment).
const AutocompleteModelOutputSchema = z.array(z.object({
  day: z.string(),
  mealId: z.string(),
  recipeId: z.string(),
}));

// What the flow returns to callers: the placements it could make (whole
// servings only, within the goal margin when priority is "goal"), plus the
// slots it deliberately left empty because no eligible recipe could hit the
// target with a realistic whole number of servings.
const AutocompleteOutputSchema = z.object({
  placements: z.array(z.object({
    day: z.string(),
    mealId: z.string(),
    recipeId: z.string(),
    servings: z.number(),
  })),
  unfilled: z.array(z.object({
    day: z.string(),
    /** Para poder marcar el hueco concreto en el cuadrante, no solo nombrarlo. */
    mealId: z.string(),
    mealTitle: z.string(),
    /**
     * POR QUÉ se quedó vacío. Antes todos los huecos se explicaban con la misma
     * frase ("no encontré una ración entera dentro de tu margen"), que solo era
     * cierta en uno de los tres casos: si no tienes NINGUNA receta de cena, el
     * consejo de "prueba con un margen más flexible" no arregla nada y manda al
     * usuario a tocar donde no es.
     *
     * - `sin_recetas`: ninguna receta del recetario sirve para ese tipo de
     *   comida (o la dieta/las alergias las descartaron todas).
     * - `tope_repeticion`: sí hay recetas, pero todas han llegado ya al máximo
     *   de veces por semana que el usuario permitió.
     * - `margen_calorico`: hay recetas disponibles, pero ninguna cuadra con las
     *   calorías del hueco en un número entero de raciones.
     */
    reason: z.enum(['sin_recetas', 'tope_repeticion', 'margen_calorico']),
  })),
});

export type AutocompleteResult = z.infer<typeof AutocompleteOutputSchema>;

// A slot may accept several meal types. Size it by the most caloric one
// (e.g. "cena + postre" → cena's share, not the sum). The per-type calorie
// shares live in lib/serving-utils (`mealCalorieRatio`), shared with the
// planner so both always split the day the same way.
function getMealCalorieRatio(mealTypes: MealCategory[], mealTitle: string): number {
  const types = mealTypes.length > 0 ? mealTypes : [inferTypeFromTitle(mealTitle)];
  return mealCalorieRatio(types);
}

function inferTypeFromTitle(mealTitle: string): MealCategory {
  const t = mealTitle.toLowerCase();
  if (t.includes('desayuno') || t.includes('breakfast') || t.includes('mañana')) return 'desayuno';
  if (t.includes('almuerzo') || t.includes('comida') || t.includes('lunch')) return 'almuerzo';
  if (t.includes('cena') || t.includes('dinner') || t.includes('supper')) return 'cena';
  if (t.includes('merienda') || t.includes('tentempié') || t.includes('tentempie')) return 'merienda';
  if (t.includes('snack')) return 'snack';
  if (t.includes('postre') || t.includes('dessert')) return 'postre';
  return 'otro';
}

// A meal slot is at most this many servings of ONE recipe — beyond that, no
// realistic whole-serving amount of a single dish should be suggested.
const MAX_SERVINGS_PER_SLOT = 3;

// Search every eligible recipe at every realistic whole-serving count (1..max)
// for one that lands the slot's calories within ±marginPercent of the target.
// Keeps `preferredRecipeId` (the model's pick) if it can hit the margin at some
// serving count, even if another recipe would fit slightly tighter — switching
// recipes should be a last resort, not a tie-breaker. Returns null when nothing
// eligible can realistically hit the margin.
/**
 * Estimación de lo que cuesta una comida fuera de casa. Fija a propósito: la
 * ración de un restaurante no depende del objetivo de quien la pide.
 */
const TYPICAL_MEAL_OUT_KCAL = 1200;
/** Peso de una comida principal en el día (el de 'almuerzo' en los ratios). */
const TYPICAL_MEAL_SHARE = 0.35;
/** Suelo, para que con objetivos muy altos no se reserve prácticamente nada. */
const MIN_FREE_MEAL_EXTRA = 150;

function bestFitWithinMargin(
  eligibleIds: string[],
  simplifiedById: Map<string, { caloriesPerServing: number }>,
  targetCalories: number,
  marginPercent: number,
  preferredRecipeId: string | undefined,
  maxServings: number,
  // With "comidas libres" planned, going over target is worse than going
  // under by the same amount: under-target picks leave weekly slack for the
  // off-plan meals. Overshoot deviations get a 1.5× penalty.
  preferUnder = false,
  /**
   * Veces que cada receta lleva ya colocadas en la semana. Se mira ANTES que el
   * ajuste calórico a propósito: aquí dentro solo se comparan combinaciones que
   * YA caen dentro del margen, así que todas valen y entre dos que valen es
   * mejor la que aún no has comido. Sin esto, la que mejor encajaba se llevaba
   * lunes, martes y miércoles seguidos hasta agotar el tope.
   */
  usageOf: (id: string) => number = () => 0
): { recipeId: string; servings: number } | null {
  const lo = targetCalories * (1 - marginPercent / 100);
  const hi = targetCalories * (1 + marginPercent / 100);
  let best: { recipeId: string; servings: number; deviation: number; preferred: boolean; uses: number } | null = null;

  for (const id of eligibleIds) {
    const r = simplifiedById.get(id);
    if (!r || r.caloriesPerServing <= 0) continue;
    const uses = usageOf(id);
    for (let servings = 1; servings <= maxServings; servings++) {
      const cals = r.caloriesPerServing * servings;
      if (cals < lo || cals > hi) continue;
      const rawDeviation = cals - targetCalories;
      const deviation = preferUnder && rawDeviation > 0 ? rawDeviation * 1.5 : Math.abs(rawDeviation);
      const preferred = id === preferredRecipeId;
      const better =
        !best ||
        uses < best.uses ||
        (uses === best.uses &&
          ((preferred && !best.preferred) || (preferred === best.preferred && deviation < best.deviation)));
      if (better) best = { recipeId: id, servings, deviation, preferred, uses };
    }
  }
  return best ? { recipeId: best.recipeId, servings: best.servings } : null;
}

const autocompleteWeekFlow = ai.defineFlow(
  {
    name: 'autocompleteWeekFlow',
    inputSchema: AutocompleteInputSchema,
    outputSchema: AutocompleteOutputSchema,
  },
  async ({ weekPlan, availableRecipes, activeGoal, preferences }) => {

    // Use per-serving macros so the AI can reason about real intake.
    // Shuffled: with a stable ordering the model kept gravitating to the same
    // early entries, producing near-identical plans run after run. The
    // deterministic placement pass below works off maps, so order only affects
    // which candidates the model "sees first".
    const allRecipes = availableRecipes as Recipe[];

    /**
     * Filtro de alergias DETERMINISTA, antes de que el modelo vea nada.
     *
     * Hasta ahora las alergias solo vivían en el prompt ("evita estos, juzga
     * por el nombre de la receta"), y lo que se le enseña de cada receta es
     * id/nombre/categoría/macros — SIN ingredientes. Por el nombre no hay forma
     * de saber que una ensalada César lleva huevo y anchoas. Aquí sí se miran
     * los ingredientes, que estaban disponibles todo el tiempo.
     *
     * Si esto vacía la lista, NO se cae atrás a incluirlas: se dejan huecos sin
     * rellenar. Un plan incompleto se arregla; un alérgeno colado, no.
     */
    const allergenTerms = expandAllergens(preferences.interview?.allergies ?? []);
    const blocked = new Map<string, string>(); // receta → término que la descarta
    // Vetadas para esta pasada (el "no quiero tanto atún" del asistente). Igual
    // que las alergias: fuera antes de que el modelo las vea, no en el prompt.
    const excluded = new Set(preferences.excludeRecipeIds ?? []);
    const recipes = allRecipes.filter(r => {
      if (excluded.has(r.id)) return false;
      const hit = recipeHasAllergen(r, allergenTerms);
      if (hit) blocked.set(r.name, hit);
      return !hit;
    });
    if (blocked.size > 0) {
      console.info(
        `[autocomplete] ${blocked.size} receta(s) descartadas por alergia:`,
        [...blocked.entries()].map(([n, t]) => `${n} (${t})`).join(', ')
      );
    }

    const simplifiedRecipes = recipes.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category ?? [],
      dietTags: r.dietTags ?? [],
      caloriesPerServing: Math.round(r.calories / (r.servings ?? 1)),
      proteinPerServing: Math.round(r.protein / (r.servings ?? 1)),
      servings: r.servings ?? 1,
    }));
    for (let i = simplifiedRecipes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [simplifiedRecipes[i], simplifiedRecipes[j]] = [simplifiedRecipes[j], simplifiedRecipes[i]];
    }

    // Diet pre-filter: keep recipes compatible with the selected diet (no diet tags
    // = comodín, always compatible). Everything downstream draws from this pool. If
    // the pool would be empty, fall back to all recipes so the plan still fills.
    const diet = (preferences.diet ?? []) as DietTag[];
    const dietCompatible = diet.length === 0
      ? recipes
      : recipes.filter(r => {
          const tags = r.dietTags ?? [];
          return tags.length === 0 || tags.some(t => diet.includes(t));
        });
    const dietPool = dietCompatible.length > 0 ? dietCompatible : recipes;

    // Deterministic eligibility per slot. A slot may accept several meal types:
    //   - recipes whose category intersects the slot's mealTypes, PLUS
    //   - category-less "comodín" recipes (usable anywhere).
    // If that set is empty, fall back to the whole diet pool so the slot still fills.
    // Slots that include 'otro' (or have no types) accept any recipe in the pool.
    const eligibleIdsFor = (mealTypes: MealCategory[]): string[] => {
      // En una comida PRINCIPAL solo entra lo que esté etiquetado como comida
      // principal (o lo que no tenga categoría, que es comodín). El usuario se
      // encontró dos tartas puestas de almuerzo: su receta no casaba con
      // ninguna categoría, el respaldo metía TODA la lista y las categorías
      // dejaban de contar. Se descartan ANTES del respaldo, no después.
      //
      // Se mira que TENGA una principal, no que "no sea postre": un brownie
      // etiquetado postre+merienda es una merienda estupenda y un almuerzo
      // pésimo, y con la regla en negativo se colaba igual.
      const MAIN: MealCategory[] = ['desayuno', 'almuerzo', 'cena'];
      const isMainMeal = mealTypes.some(t => MAIN.includes(t));
      const pool = isMainMeal
        ? dietPool.filter(r => {
            const cats = r.category ?? [];
            return cats.length === 0 || cats.some(c => MAIN.includes(c));
          })
        : dietPool;

      if (mealTypes.length === 0 || mealTypes.includes('otro')) return pool.map(r => r.id);
      const matching = pool.filter(r => {
        const cats = r.category ?? [];
        return cats.length === 0 || cats.some(c => mealTypes.includes(c));
      });
      return (matching.length > 0 ? matching : pool).map(r => r.id);
    };

    // Extract empty slots with per-slot calorie/protein targets derived from the daily goal
    const rawGoal = activeGoal as GoalMacros | null;

    /**
     * Objetivo diario rebajado para dejar sitio a las comidas libres.
     *
     * Una comida fuera NO se suma entera: sustituye a la del plan de ese día,
     * así que lo que sobra es la DIFERENCIA. Y esa diferencia depende de la
     * persona en sentido contrario al que parece: la comida de fuera cuesta lo
     * que cuesta (la ración del restaurante no sabe tu objetivo), pero la que
     * te ahorras sí escala contigo. Quien menos come es quien más se desvía.
     *
     * No se mete el sexo: ya está dentro, porque la calculadora lo usa para
     * fijar el objetivo diario que entra aquí. Contarlo otra vez sería doble.
     */
    const goal: GoalMacros | null = (() => {
      const freeMeals = preferences.interview?.freeMealsPerWeek ?? 0;
      if (!rawGoal || freeMeals <= 0) return rawGoal;
      const plannedMeal = rawGoal.calories * TYPICAL_MEAL_SHARE;
      const perMeal = Math.max(MIN_FREE_MEAL_EXTRA, TYPICAL_MEAL_OUT_KCAL - plannedMeal);
      const dailyCut = (freeMeals * perMeal) / 7;
      return { ...rawGoal, calories: Math.max(rawGoal.calories * 0.6, rawGoal.calories - dailyCut) };
    })();
    const emptySlots = (weekPlan as WeekPlan).flatMap(dayPlan =>
      dayPlan.meals
        .filter(meal => meal.recipes.length === 0)
        .map(meal => {
          const mealTypes = (meal.mealTypes && meal.mealTypes.length > 0)
            ? meal.mealTypes
            : [inferTypeFromTitle(meal.title)];
          const ratio = getMealCalorieRatio(mealTypes, meal.title);
          return {
            day: dayPlan.day,
            mealId: meal.id,
            mealTitle: meal.title,
            mealTypes,
            eligibleRecipeIds: eligibleIdsFor(mealTypes),
            targetCalories: goal ? Math.round(goal.calories * ratio) : null,
            targetProtein: goal ? Math.round(goal.protein * ratio) : null,
          };
        })
    );

    // Already-filled meals for repetition context
    const filledEntries = (weekPlan as WeekPlan).flatMap(dayPlan =>
      dayPlan.meals.flatMap(meal =>
        meal.recipes.map(r => `${dayPlan.day} / ${meal.title}: ${r.name}`)
      )
    );

    if (emptySlots.length === 0) return { placements: [], unfilled: [] };

    // 'max_twice' (legacy) behaves as a fixed limit of 2; 'max_n' uses the
    // user-chosen maxRepetitions (defaulting to 2 if somehow absent).
    const maxReps = preferences.allowRepetition === 'max_twice' ? 2 : preferences.maxRepetitions ?? 2;
    const repetitionRule =
      preferences.allowRepetition === 'no_repeat'
        ? 'Each recipe can only appear ONCE across the entire week. Do not repeat any recipe.'
        : preferences.allowRepetition === 'free'
        ? 'There is no restriction on recipe repetition.'
        : `Each recipe can appear at most ${maxReps} times across the entire week.`;

    const margin = preferences.goalMarginPercent ?? 15;
    const priorityRule =
      preferences.priority === 'goal' && goal
        ? `Each slot already has a pre-computed "targetCalories" and "targetProtein" (derived from the daily goal of ${goal.calories} kcal / ${goal.protein}g protein split proportionally by meal type).
For EACH slot independently, choose the recipe whose caloriesPerServing is CLOSEST to that slot's targetCalories (within ±${margin}% if possible, counting only whole numbers of servings — 1x, 2x, 3x caloriesPerServing).
If no recipe fits within the margin at a whole number of servings, still pick your best candidate — the app will decide whether to place it or leave the slot empty for the user to adjust.
Do NOT try to balance across all meals simultaneously — just minimise the gap for each individual slot.`
        : preferences.priority === 'protein'
        ? 'Prioritize recipes with the highest proteinPerServing.'
        : 'Prioritize recipes with the lowest caloriesPerServing.';

    const restrictionRule = preferences.dietaryRestrictions
      ? `The user wrote these free-form food preferences: "${preferences.dietaryRestrictions}". Interpret them naturally: NEVER pick recipes containing ingredients or dishes they dislike or exclude, and when they ask FOR something specific (e.g. "quiero hamburguesas"), try to include a matching recipe in an appropriate slot at least once during the week.`
      : '';

    // ── Entrevista (questionnaire) rules ────────────────────────────────────
    const interview = preferences.interview;
    const interviewRules: string[] = [];
    if (interview) {
      if (interview.allergies.length > 0) {
        interviewRules.push(`ALLERGIES (ABSOLUTE, overrides everything): the user is allergic/intolerant to: ${interview.allergies.join(', ')}. NEVER pick a recipe that plausibly contains any of these — judge by the recipe name; when in doubt, skip it.`);
      }
      if (interview.avoidFoods.length > 0) {
        interviewRules.push(`DISLIKES: the user avoids: ${interview.avoidFoods.join(', ')}. Do not pick recipes featuring them.`);
      }
      if (interview.favoriteFoods.length > 0) {
        interviewRules.push(`FAVOURITES: the user loves: ${interview.favoriteFoods.join(', ')}. When several eligible recipes fit a slot equally well, prefer one featuring a favourite. Spread favourites across the week rather than stacking them all in one day.`);
      }
      // Platos elegidos a dedo por el usuario. Van con los ids reales para que
      // el modelo no tenga que adivinar cuál es: es lo más cerca de una orden
      // directa que hay en toda la entrevista.
      if (interview.favoriteRecipes?.length) {
        const list = interview.favoriteRecipes
          .map((r) => `"${r.name}" (id ${r.recipeId}) ${r.perWeek}×`)
          .join(', ');
        interviewRules.push(
          `MUST-HAVE DISHES (highest priority after allergies): the user hand-picked these and how many times a week they want them: ${list}. Place each one that many times, spread across different days, BEFORE filling the remaining slots with anything else. Only skip one if its id is not in the slot's eligibleRecipeIds anywhere in the week.`
        );
      }
      const wishes: string[] = [];
      if (interview.weeklyWishes.legumbres) wishes.push(`at least ${interview.weeklyWishes.legumbres} legume dish(es) (lentejas, garbanzos, alubias…)`);
      if (interview.weeklyWishes.vegetariano) wishes.push(`at least ${interview.weeklyWishes.vegetariano} vegetarian dish(es)`);
      if (interview.weeklyWishes.pescado) wishes.push(`at least ${interview.weeklyWishes.pescado} fish dish(es)`);
      if (wishes.length > 0) {
        interviewRules.push(`WEEKLY GOALS: across the whole week, try to include ${wishes.join('; ')} in lunch/dinner slots. Count recipes already placed in the ALREADY FILLED list towards these goals.`);
      }
      if (interview.varietyPreference === 'variedad') {
        interviewRules.push('VARIETY: the user wants maximum variety. Beyond the repetition limit, also avoid picking several recipes that are minor variations of the same dish (e.g. three different chicken burgers).');
      } else {
        interviewRules.push('BATCH COOKING: the user is happy eating the same dish several times — when a recipe fits well, repeating it (within the repetition limit) is welcome.');
      }
      if (interview.quickWeekdays) {
        interviewRules.push('WEEKDAY SPEED: Monday–Friday, prefer quick simple dishes (salads, bowls, wraps, sandwiches, sheet-pan…); leave elaborate dishes for Saturday/Sunday. Judge by the recipe name.');
      }
      if ((interview.freeMealsPerWeek ?? 0) > 0) {
        interviewRules.push(`FLEXIBILITY: the user plans ${interview.freeMealsPerWeek} free meal(s) this week (meals they'll eat off-plan — dinner out, pizza with friends). STILL fill every slot, but when two recipes fit a slot equally well, prefer the slightly LIGHTER one so the week keeps some calorie slack for those free meals.`);
      }
    }

    // Anti-monotony: discourage rebuilding the same plan as previous weeks.
    const recentNames = (preferences.recentRecipeNames ?? []).slice(0, 60);
    const freshnessRule = recentNames.length > 0
      ? `RECENTLY USED (from the user's previous saved weeks): ${recentNames.join('; ')}. Prefer eligible recipes NOT on this list so consecutive weeks feel different. This is a soft preference — nutrition rules and meal-type fit always win.`
      : '';

    const prompt = `
You are an expert nutritionist AI. Fill the empty meal slots in a user's weekly plan.

SLOTS TO FILL (each has mealTypes and a pre-computed list of eligibleRecipeIds):
${JSON.stringify(emptySlots, null, 2)}

ALREADY FILLED meals (for repetition context):
${filledEntries.length > 0 ? filledEntries.join('\n') : 'None yet.'}

AVAILABLE RECIPES (each has a "category" array = the meal types it fits; empty = fits any meal):
${JSON.stringify(simplifiedRecipes, null, 2)}

RULES — follow ALL of them:

1. ELIGIBILITY (MANDATORY, HARD CONSTRAINT):
   For each slot, you MUST choose a recipeId that appears in THAT slot's "eligibleRecipeIds" list.
   Never pick a recipeId outside that list.

2. MEAL-TYPE FIT (MANDATORY): Each slot has "mealTypes" (e.g. ["desayuno"], ["cena"]). The recipe
   you choose MUST genuinely suit that meal type — use the recipe NAME to judge this.
   - A "desayuno" (breakfast) slot needs a breakfast-appropriate dish (tostadas, huevos, avena,
     yogur, tortitas, fruta, café, batidos, etc.). NEVER place a clearly lunch/dinner main dish
     (hamburguesa, guiso, pasta, pizza, asado, lasaña, etc.) in a breakfast slot.
   - "almuerzo"/"cena" slots take savoury main dishes; "merienda"/"snack" take light bites;
     "postre" takes desserts.
   The eligibleRecipeIds list may include uncategorised "comodín" recipes that fit any slot — even
   so, only choose one if it actually makes sense for THIS meal type. If several recipes are
   eligible, prefer the one that best fits the meal type, THEN optimise nutrition.
   Only if NO eligible recipe suits the meal type at all may you fall back to the closest option.

3. REPETITION: ${repetitionRule}

4. NUTRITION (apply only among recipes that already fit the meal type): ${priorityRule}

${restrictionRule ? `5. FOOD PREFERENCES: ${restrictionRule}` : ''}

${interviewRules.length > 0 ? `6. USER INTERVIEW (their saved nutritional preferences — respect ALL of these):
${interviewRules.map(r => `   - ${r}`).join('\n')}` : ''}

${freshnessRule ? `7. ${freshnessRule}` : ''}

For EVERY slot in the list above, select EXACTLY ONE recipeId from that slot's eligibleRecipeIds.
Return ONLY a JSON array. Each element: { "day": string, "mealId": string, "recipeId": string }
    `.trim();

    const response = await ai.generate({
      model: GEMINI_MODEL_BULK,
      prompt,
      output: {
        schema: AutocompleteModelOutputSchema,
      },
    });

    const assignments = response.output || [];
    const assignmentBySlotKey = new Map(assignments.map(a => [`${a.day}|${a.mealId}`, a]));
    const simplifiedById = new Map(simplifiedRecipes.map(r => [r.id, r]));
    const recipeById = new Map(recipes.map(r => [r.id, r]));
    const useGoalMargin = preferences.priority === 'goal' && !!goal;

    // Deterministic placement pass: enforce the category constraint regardless of
    // what the model returned, and — when optimising for the goal — never place a
    // fractional serving. Either a whole-serving amount of an eligible recipe hits
    // the margin, or the slot is deliberately left empty for the user to fix (wider
    // margin, or a recipe closer to that slot's calorie target).
    const placements: { day: string; mealId: string; recipeId: string; servings: number }[] = [];

    /**
     * Tope de repeticiones, IMPUESTO aquí y no solo pedido en el prompt.
     *
     * El prompt lleva la regla desde siempre, pero el modelo se la salta: con
     * "prioriza el objetivo" hay una receta que es la que mejor encaja en una
     * franja, y la elegía para las siete. El usuario acabó con el mismo plato
     * seis veces y repetido de lunes a sábado. Es el mismo fallo que tenían las
     * alergias: decírselo al modelo no es imponerlo.
     */
    const cap =
      preferences.allowRepetition === 'free'
        ? Number.POSITIVE_INFINITY
        : preferences.allowRepetition === 'no_repeat'
        ? 1
        : maxReps;

    // Lo que YA está puesto en la semana cuenta para el tope: si el lunes hay
    // lentejas puestas a mano, el autocompletado no debe llenar con lentejas
    // hasta el tope otra vez.
    const usage = new Map<string, number>();
    (weekPlan as WeekPlan).forEach(dayPlan =>
      dayPlan.meals.forEach(meal =>
        meal.recipes.forEach(r => usage.set(r.id, (usage.get(r.id) ?? 0) + 1))
      )
    );
    const underCap = (id: string) => (usage.get(id) ?? 0) < cap;
    const countUse = (id: string) => usage.set(id, (usage.get(id) ?? 0) + 1);

    /**
     * Platos fijos, colocados ANTES que nada y sin pasar por el modelo.
     *
     * Eran otra regla del prompt, con el mismo final: el usuario dice "tortitas
     * dos veces por semana" y el plan sale sin tortitas. Se colocan aquí, y se
     * saltan el tope de repeticiones a propósito: elegir un plato concreto N
     * veces es más explícito que la preferencia general de variedad.
     */
    const takenSlots = new Set<string>();
    for (const fav of interview?.favoriteRecipes ?? []) {
      let placed = 0;
      const daysUsed = new Set<string>();
      // Primera pasada, un día distinto cada vez; si aún faltan, se repite día.
      for (const spreadOnly of [true, false]) {
        for (const slot of emptySlots) {
          if (placed >= fav.perWeek) break;
          const key = `${slot.day}|${slot.mealId}`;
          if (takenSlots.has(key)) continue;
          if (spreadOnly && daysUsed.has(slot.day)) continue;
          if (!slot.eligibleRecipeIds.includes(fav.recipeId)) continue;
          const recipe = recipeById.get(fav.recipeId);
          const servings = recipe ? suggestedServings(recipe, slot.targetCalories) : 1;
          placements.push({ day: slot.day, mealId: slot.mealId, recipeId: fav.recipeId, servings });
          takenSlots.add(key);
          daysUsed.add(slot.day);
          countUse(fav.recipeId);
          placed++;
        }
      }
    }

    /**
     * Por qué se quedó vacío cada hueco. Se anota en el momento de descartarlo,
     * que es el único sitio donde se sabe: al final ya solo queda "no está en
     * placements", que no distingue entre no tener recetas y no cuadrar las
     * calorías — y el consejo que hay que dar es distinto en cada caso.
     */
    const reasonByKey = new Map<string, 'sin_recetas' | 'tope_repeticion' | 'margen_calorico'>();

    for (const slot of emptySlots) {
      const key = `${slot.day}|${slot.mealId}`;
      if (takenSlots.has(key)) continue; // ya lo ocupa un plato fijo
      const modelPick = assignmentBySlotKey.get(key)?.recipeId;

      // Solo se consideran las que aún no han llegado al tope. Si no queda
      // ninguna, el hueco se deja vacío y se avisa: repetir por séptima vez lo
      // que el usuario dijo que no quería repetir es peor que dejarlo a medias.
      const available = slot.eligibleRecipeIds.filter(underCap);
      if (available.length === 0) {
        // Distinguir las dos causas: no haber recetas para ese tipo de comida no
        // se arregla igual que haberlas gastado todas contra el tope.
        reasonByKey.set(key, slot.eligibleRecipeIds.length === 0 ? 'sin_recetas' : 'tope_repeticion');
        continue;
      }

      // Closest-to-target eligible recipe — used when the model's pick is missing
      // or outside the eligible set, and as the margin search's preferred seed.
      const fallbackId = available
        .map(id => simplifiedById.get(id))
        .filter((r): r is NonNullable<typeof r> => !!r)
        .sort((x, y) => {
          // Menos usada primero, y a igualdad la que más se acerque al objetivo.
          const byUse = (usage.get(x.id) ?? 0) - (usage.get(y.id) ?? 0);
          if (byUse !== 0) return byUse;
          if (slot.targetCalories == null) return 0;
          return Math.abs(x.caloriesPerServing - slot.targetCalories) - Math.abs(y.caloriesPerServing - slot.targetCalories);
        })[0]?.id ?? available[0];

      const candidateId = modelPick && available.includes(modelPick) ? modelPick : fallbackId;
      if (!candidateId) {
        reasonByKey.set(key, 'sin_recetas'); // no eligible recipe at all for this slot
        continue;
      }

      if (useGoalMargin && slot.targetCalories != null) {
        const preferUnder = (interview?.freeMealsPerWeek ?? 0) > 0;
        const fit = bestFitWithinMargin(available, simplifiedById, slot.targetCalories, margin, candidateId, MAX_SERVINGS_PER_SLOT, preferUnder, id => usage.get(id) ?? 0);
        if (fit) {
          placements.push({ day: slot.day, mealId: slot.mealId, recipeId: fit.recipeId, servings: fit.servings });
          countUse(fit.recipeId);
        } else {
          // Hay recetas disponibles; lo que no hay es un número entero de
          // raciones que caiga dentro del margen. Éste sí se arregla ampliando
          // el margen, y es el único caso en el que ese consejo sirve.
          reasonByKey.set(key, 'margen_calorico');
        }
      } else {
        const recipe = recipeById.get(candidateId);
        const servings = recipe ? suggestedServings(recipe, slot.targetCalories) : 1;
        placements.push({ day: slot.day, mealId: slot.mealId, recipeId: candidateId, servings });
        countUse(candidateId);
      }
    }

    const filledKeys = new Set(placements.map(p => `${p.day}|${p.mealId}`));
    const unfilled = emptySlots
      .filter(s => !filledKeys.has(`${s.day}|${s.mealId}`))
      .map(s => ({
        day: s.day,
        mealId: s.mealId,
        mealTitle: s.mealTitle,
        // `sin_recetas` como respaldo: si un hueco acabó vacío sin pasar por
        // ninguna de las ramas de arriba, es que no había con qué llenarlo.
        reason: reasonByKey.get(`${s.day}|${s.mealId}`) ?? ('sin_recetas' as const),
      }));

    return { placements, unfilled };
  }
);

export async function autocompleteWeek(input: {
  weekPlan: unknown;
  availableRecipes: unknown;
  activeGoal: unknown;
  preferences: {
    allowRepetition: 'no_repeat' | 'max_n' | 'max_twice' | 'free';
    maxRepetitions?: number;
    priority: 'goal' | 'protein' | 'calories';
    dietaryRestrictions?: string;
    goalMarginPercent?: number;
    diet?: DietTag[];
    interview?: InterviewForPrompt;
    recentRecipeNames?: string[];
    excludeRecipeIds?: string[];
  };
}): Promise<AutocompleteResult> {
  return autocompleteWeekFlow(input);
}
