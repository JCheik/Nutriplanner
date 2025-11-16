'use server';

/**
 * @fileOverview Recipe suggestion flow based on dietary preferences.
 *
 * - suggestRecipesFromPreferences - A function that suggests recipes based on dietary preferences.
 * - SuggestRecipesFromPreferencesInput - The input type for the suggestRecipesFromPreferences function.
 * - SuggestRecipesFromPreferencesOutput - The return type for the suggestRecipesFromPreferences function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRecipesFromPreferencesInputSchema = z.object({
  dietaryPreferences: z
    .string()
    .describe('The dietary preferences of the user (e.g., vegetarian, gluten-free, low-carb).'),
  availableIngredients: z
    .string()
    .optional()
    .describe('The ingredients that the user has available (optional).'),
});
export type SuggestRecipesFromPreferencesInput = z.infer<
  typeof SuggestRecipesFromPreferencesInputSchema
>;

const SuggestRecipesFromPreferencesOutputSchema = z.object({
  recipes: z
    .array(z.string())
    .describe('An array of recipe suggestions that match the dietary preferences.'),
});
export type SuggestRecipesFromPreferencesOutput = z.infer<
  typeof SuggestRecipesFromPreferencesOutputSchema
>;

export async function suggestRecipesFromPreferences(
  input: SuggestRecipesFromPreferencesInput
): Promise<SuggestRecipesFromPreferencesOutput> {
  return suggestRecipesFromPreferencesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRecipesFromPreferencesPrompt',
  input: {schema: SuggestRecipesFromPreferencesInputSchema},
  output: {schema: SuggestRecipesFromPreferencesOutputSchema},
  prompt: `You are a recipe suggestion AI. Given the following dietary preferences and available ingredients, suggest some recipes.

Dietary Preferences: {{{dietaryPreferences}}}
Available Ingredients: {{{availableIngredients}}}

Recipes:`, // Instructions for the AI
});

const suggestRecipesFromPreferencesFlow = ai.defineFlow(
  {
    name: 'suggestRecipesFromPreferencesFlow',
    inputSchema: SuggestRecipesFromPreferencesInputSchema,
    outputSchema: SuggestRecipesFromPreferencesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
