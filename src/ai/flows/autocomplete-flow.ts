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

    const repetitionRule =
      preferences.allowRepetition === 'no_repeat'
        ? 'IMPORTANT: Each recipe can only appear ONCE across the entire week. Do not repeat any recipe.'
        : preferences.allowRepetition === 'max_twice'
        ? 'Each recipe can appear at most 2 times across the entire week.'
        : 'There is no restriction on recipe repetition.';

    const priorityRule =
      preferences.priority === 'goal' && activeGoal
        ? `IMPORTANT: The user has a daily nutritional goal of ${activeGoal.calories} kcal and ${activeGoal.protein}g protein.
Try to select recipes for each day so that the SUM of calories across all meals stays within ±${preferences.goalMarginPercent ?? 15}% of the daily goal (${Math.round(activeGoal.calories * (1 - (preferences.goalMarginPercent ?? 15) / 100))}–${Math.round(activeGoal.calories * (1 + (preferences.goalMarginPercent ?? 15) / 100))} kcal).
Distribute calories intelligently: breakfast ~25%, lunch ~40%, dinner ~30%, snacks ~5%.`
        : preferences.priority === 'protein'
        ? 'Prioritize recipes with the highest protein per serving.'
        : 'Prioritize recipes with the lowest calories per serving.';

    const restrictionRule = preferences.dietaryRestrictions
      ? `The user has the following dietary restrictions: "${preferences.dietaryRestrictions}". Only suggest recipes that comply.`
      : '';

    const prompt = `
You are an expert nutritionist AI. Your task is to auto-complete a user's weekly meal plan.

Here is the current week plan. Only fill meals where the recipes array is EMPTY:
${JSON.stringify(weekPlan)}

Here are the available recipes with per-serving nutrition:
${JSON.stringify(simplifiedRecipes)}

Rules you MUST follow:
1. ${repetitionRule}
2. ${priorityRule}
${restrictionRule ? `3. ${restrictionRule}` : ''}

For EVERY meal that has an empty recipes array, select EXACTLY ONE recipe ID from the available list.

Return a JSON array of objects. Each object must have:
- day: the day of the week (e.g. "Lunes")
- mealId: the id of the meal slot
- recipeId: the id of the chosen recipe

DO NOT return any text or markdown, ONLY the JSON array.
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
