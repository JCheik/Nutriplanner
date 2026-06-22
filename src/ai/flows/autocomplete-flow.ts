'use server';

import { ai } from '@/ai/genkit';
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

export const autocompleteWeekFlow = ai.defineFlow(
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

    // Extract only the empty slots the AI needs to fill, with their title visible
    const emptySlots = (weekPlan as WeekPlan).flatMap(dayPlan =>
      dayPlan.meals
        .filter(meal => meal.recipes.length === 0)
        .map(meal => ({ day: dayPlan.day, mealId: meal.id, mealTitle: meal.title }))
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

    const priorityRule =
      preferences.priority === 'goal' && activeGoal
        ? `The user has a daily nutritional goal of ${activeGoal.calories} kcal and ${activeGoal.protein}g protein.
Try to select recipes for each day so that the SUM of calories across all meals stays within ±${preferences.goalMarginPercent ?? 15}% of the daily goal (${Math.round(activeGoal.calories * (1 - (preferences.goalMarginPercent ?? 15) / 100))}–${Math.round(activeGoal.calories * (1 + (preferences.goalMarginPercent ?? 15) / 100))} kcal).
Distribute calories intelligently: breakfast ~25%, lunch ~35%, dinner ~30%, snacks ~10%.`
        : preferences.priority === 'protein'
        ? 'Prioritize recipes with the highest protein per serving.'
        : 'Prioritize recipes with the lowest calories per serving.';

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
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: {
        schema: AutocompleteOutputSchema,
      },
    });

    return response.output || [];
  }
);
