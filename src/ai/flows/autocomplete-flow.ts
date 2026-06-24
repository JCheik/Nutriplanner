'use server';

import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'zod';
import type { WeekPlan, GoalMacros, Recipe } from '@/lib/types';

const AutocompletePreferencesSchema = z.object({
  allowRepetition: z.enum(['no_repeat', 'max_twice', 'free']),
  priority: z.enum(['goal', 'protein', 'calories']),
  dietaryRestrictions: z.string().optional(),
  goalMarginPercent: z.number().optional(),
});

const AutocompleteInputSchema = z.object({
  weekPlan: z.any(),
  availableRecipes: z.any(),
  activeGoal: z.any().nullable(),
  preferences: AutocompletePreferencesSchema,
});

const AutocompleteOutputSchema = z.array(z.object({
  day: z.string(),
  mealId: z.string(),
  recipeId: z.string(),
}));

function getMealCalorieRatio(mealTitle: string): number {
  const t = mealTitle.toLowerCase();
  if (t.includes('desayuno') || t.includes('breakfast') || t.includes('mañana')) return 0.25;
  if (t.includes('almuerzo') || t.includes('comida') || t.includes('lunch')) return 0.35;
  if (t.includes('cena') || t.includes('dinner') || t.includes('supper')) return 0.30;
  if (t.includes('merienda') || t.includes('snack') || t.includes('tentempié')) return 0.10;
  return 0.25;
}

const autocompleteWeekFlow = ai.defineFlow(
  {
    name: 'autocompleteWeekFlow',
    inputSchema: AutocompleteInputSchema,
    outputSchema: AutocompleteOutputSchema,
  },
  async ({ weekPlan, availableRecipes, activeGoal, preferences }) => {

    // Use per-serving macros so the AI can reason about real intake
    const simplifiedRecipes = (availableRecipes as Recipe[]).map(r => ({
      id: r.id,
      name: r.name,
      caloriesPerServing: Math.round(r.calories / (r.servings ?? 1)),
      proteinPerServing: Math.round(r.protein / (r.servings ?? 1)),
      servings: r.servings ?? 1,
    }));

    // Extract empty slots with per-slot calorie/protein targets derived from the daily goal
    const goal = activeGoal as GoalMacros | null;
    const emptySlots = (weekPlan as WeekPlan).flatMap(dayPlan =>
      dayPlan.meals
        .filter(meal => meal.recipes.length === 0)
        .map(meal => {
          const ratio = getMealCalorieRatio(meal.title);
          return {
            day: dayPlan.day,
            mealId: meal.id,
            mealTitle: meal.title,
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

SLOTS TO FILL (each has a mealTitle indicating the meal type):
${JSON.stringify(emptySlots, null, 2)}

ALREADY FILLED meals (for repetition context):
${filledEntries.length > 0 ? filledEntries.join('\n') : 'None yet.'}

AVAILABLE RECIPES:
${JSON.stringify(simplifiedRecipes, null, 2)}

RULES — follow ALL of them:

1. MEAL-TIME APPROPRIATENESS (MANDATORY):
   Match the recipe to the mealTitle context. Use the recipe NAME to judge suitability:
   - "Desayuno" / "Breakfast" / morning → eggs, oatmeal, yogurt, toast, fruit, cereals, smoothies, pancakes, granola, porridge.
     NEVER assign burgers, stews, pasta dishes, rice with meat, or heavy dinners to breakfast.
   - "Almuerzo" / "Comida" / "Lunch" → pasta, rice, salads, soups, wraps, sandwiches, moderate portions.
   - "Cena" / "Dinner" / "Supper" / evening → proteins with vegetables, fish, lighter pasta/rice, grilled meats, stir-fries.
     NEVER assign cereals, porridge, or clearly breakfast-only foods to dinner.
   - "Merienda" / "Snack" / "Tentempié" → fruit, nuts, protein bars, yogurt, small bites, energy balls.
   - Any custom title → use best judgment based on the name context.
   When in doubt about a recipe's meal type, choose based on its name, ingredients, and caloric density.

2. REPETITION: ${repetitionRule}

3. NUTRITION: ${priorityRule}

${restrictionRule ? `4. RESTRICTIONS: ${restrictionRule}` : ''}

For EVERY slot in the list above, select EXACTLY ONE recipeId from the available recipes.
Return ONLY a JSON array. Each element: { "day": string, "mealId": string, "recipeId": string }
    `.trim();

    const response = await ai.generate({
      model: GEMINI_MODEL,
      prompt,
      output: {
        schema: AutocompleteOutputSchema,
      },
    });

    return response.output || [];
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
  };
}): Promise<{ day: string; mealId: string; recipeId: string }[]> {
  return autocompleteWeekFlow(input);
}
