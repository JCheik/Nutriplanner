'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { WeekPlan, GoalMacros, Recipe } from '@/lib/types';

const AutocompleteInputSchema = z.object({
  weekPlan: z.any(), // WeekPlan
  availableRecipes: z.any(), // Recipe[]
  activeGoal: z.any().nullable(), // GoalMacros | null
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
  async ({ weekPlan, availableRecipes, activeGoal }) => {
    
    // Simplify available recipes for the LLM to save tokens
    const simplifiedRecipes = (availableRecipes as Recipe[]).map(r => ({
      id: r.id,
      name: r.name,
      calories: Math.round(r.calories),
      protein: Math.round(r.protein),
    }));

    const prompt = `
      You are an expert nutritionist AI. Your task is to auto-complete a user's weekly meal plan.
      
      Here is the current week plan with some empty meals (where recipes array is empty):
      ${JSON.stringify(weekPlan)}
      
      Here are the available recipes the user can choose from:
      ${JSON.stringify(simplifiedRecipes)}
      
      ${activeGoal ? `The user has a daily nutritional goal of approximately: Calories: ${activeGoal.calories}, Protein: ${activeGoal.protein}g.` : ''}
      
      Your goal: For EVERY meal that has an empty recipes array, select EXACTLY ONE recipe ID from the available recipes that makes sense (e.g., balance the meals, avoid eating the exact same thing every day unless it's breakfast).
      
      Return a JSON array of objects. Each object must have:
      - day: the day of the week
      - mealId: the id of the meal
      - recipeId: the id of the chosen recipe
      
      DO NOT return any text or markdown, ONLY the JSON array.
    `;

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: prompt,
      output: {
        schema: AutocompleteOutputSchema,
      },
    });

    return response.output || [];
  }
);
