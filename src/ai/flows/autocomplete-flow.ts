'use server';

import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'zod';
import { DIET_TAG_ENUM, type WeekPlan, type GoalMacros, type Recipe, type MealCategory, type DietTag } from '@/lib/types';
import { suggestedServings } from '@/lib/serving-utils';

const AutocompletePreferencesSchema = z.object({
  allowRepetition: z.enum(['no_repeat', 'max_twice', 'free']),
  priority: z.enum(['goal', 'protein', 'calories']),
  dietaryRestrictions: z.string().optional(),
  goalMarginPercent: z.number().optional(),
  diet: z.array(z.enum(DIET_TAG_ENUM)).optional(),
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

// What the flow returns to callers: assignment + suggested servings for the goal.
const AutocompleteOutputSchema = z.array(z.object({
  day: z.string(),
  mealId: z.string(),
  recipeId: z.string(),
  servings: z.number(),
}));

// Calorie share of the daily goal for a single meal type.
function ratioForType(type: MealCategory): number {
  switch (type) {
    case 'desayuno': return 0.25;
    case 'almuerzo': return 0.35;
    case 'cena': return 0.30;
    case 'merienda': return 0.10;
    case 'snack': return 0.10;
    case 'postre': return 0.10;
    default: return 0.25;
  }
}

// A slot may accept several meal types. Size it by the most caloric one
// (e.g. "cena + postre" → cena's share, not the sum).
function getMealCalorieRatio(mealTypes: MealCategory[], mealTitle: string): number {
  const types = mealTypes.length > 0 ? mealTypes : [inferTypeFromTitle(mealTitle)];
  return Math.max(...types.map(ratioForType));
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

const autocompleteWeekFlow = ai.defineFlow(
  {
    name: 'autocompleteWeekFlow',
    inputSchema: AutocompleteInputSchema,
    outputSchema: AutocompleteOutputSchema,
  },
  async ({ weekPlan, availableRecipes, activeGoal, preferences }) => {

    // Use per-serving macros so the AI can reason about real intake
    const recipes = availableRecipes as Recipe[];
    const simplifiedRecipes = recipes.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category ?? [],
      dietTags: r.dietTags ?? [],
      caloriesPerServing: Math.round(r.calories / (r.servings ?? 1)),
      proteinPerServing: Math.round(r.protein / (r.servings ?? 1)),
      servings: r.servings ?? 1,
    }));

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
      if (mealTypes.length === 0 || mealTypes.includes('otro')) return dietPool.map(r => r.id);
      const matching = dietPool.filter(r => {
        const cats = r.category ?? [];
        return cats.length === 0 || cats.some(c => mealTypes.includes(c));
      });
      return (matching.length > 0 ? matching : dietPool).map(r => r.id);
    };

    // Extract empty slots with per-slot calorie/protein targets derived from the daily goal
    const goal = activeGoal as GoalMacros | null;
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

    if (emptySlots.length === 0) return [];

    const repetitionRule =
      preferences.allowRepetition === 'no_repeat'
        ? 'Each recipe can only appear ONCE across the entire week. Do not repeat any recipe.'
        : preferences.allowRepetition === 'max_twice'
        ? 'Each recipe can appear at most 2 times across the entire week.'
        : 'There is no restriction on recipe repetition.';

    const margin = preferences.goalMarginPercent ?? 15;
    const priorityRule =
      preferences.priority === 'goal' && goal
        ? `Each slot already has a pre-computed "targetCalories" and "targetProtein" (derived from the daily goal of ${goal.calories} kcal / ${goal.protein}g protein split proportionally by meal type).
For EACH slot independently, choose the recipe whose caloriesPerServing is CLOSEST to that slot's targetCalories (within ±${margin}% if possible).
If no recipe fits within the margin, pick the closest one rather than leaving the slot empty.
Do NOT try to balance across all meals simultaneously — just minimise the gap for each individual slot.`
        : preferences.priority === 'protein'
        ? 'Prioritize recipes with the highest proteinPerServing.'
        : 'Prioritize recipes with the lowest caloriesPerServing.';

    const restrictionRule = preferences.dietaryRestrictions
      ? `The user has the following dietary restrictions: "${preferences.dietaryRestrictions}". Only suggest recipes that comply.`
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

${restrictionRule ? `5. RESTRICTIONS: ${restrictionRule}` : ''}

For EVERY slot in the list above, select EXACTLY ONE recipeId from that slot's eligibleRecipeIds.
Return ONLY a JSON array. Each element: { "day": string, "mealId": string, "recipeId": string }
    `.trim();

    const response = await ai.generate({
      model: GEMINI_MODEL,
      prompt,
      output: {
        schema: AutocompleteModelOutputSchema,
      },
    });

    const assignments = response.output || [];

    // Deterministic safety net: enforce the category constraint regardless of what
    // the model returned. If the model picked a recipe outside a slot's eligible
    // set (or no recipe), replace it with an eligible one closest to the target.
    // Also attach the suggested servings so the slot is sized to THIS user's goal.
    const slotByKey = new Map(emptySlots.map(s => [`${s.day}|${s.mealId}`, s]));
    const recipeById = new Map(recipes.map(r => [r.id, r]));

    return assignments.map(a => {
      const slot = slotByKey.get(`${a.day}|${a.mealId}`);
      if (!slot) return { ...a, servings: 1 };

      let recipeId = a.recipeId;
      if (!slot.eligibleRecipeIds.includes(recipeId)) {
        const simplifiedById = new Map(simplifiedRecipes.map(r => [r.id, r]));
        const target = slot.targetCalories;
        recipeId = slot.eligibleRecipeIds
          .map(id => simplifiedById.get(id))
          .filter((r): r is NonNullable<typeof r> => !!r)
          .sort((x, y) => {
            if (target == null) return 0;
            return Math.abs(x.caloriesPerServing - target) - Math.abs(y.caloriesPerServing - target);
          })[0]?.id ?? slot.eligibleRecipeIds[0];
      }

      const recipe = recipeById.get(recipeId);
      const servings = recipe ? suggestedServings(recipe, slot.targetCalories) : 1;
      return { day: a.day, mealId: a.mealId, recipeId, servings };
    });
  }
);

export async function autocompleteWeek(input: {
  weekPlan: unknown;
  availableRecipes: unknown;
  activeGoal: unknown;
  preferences: {
    allowRepetition: 'no_repeat' | 'max_twice' | 'free';
    priority: 'goal' | 'protein' | 'calories';
    dietaryRestrictions?: string;
    goalMarginPercent?: number;
    diet?: DietTag[];
  };
}): Promise<{ day: string; mealId: string; recipeId: string; servings: number }[]> {
  return autocompleteWeekFlow(input);
}
