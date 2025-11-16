'use server';
/**
 * @fileOverview Recipe suggestion flow that takes a list of ingredients and returns recipe suggestions.
 *
 * - suggestRecipesFromIngredients - A function that suggests recipes based on available ingredients.
 * - SuggestRecipesFromIngredientsInput - The input type for the suggestRecipesFromIngredients function.
 * - SuggestRecipesFromIngredientsOutput - The return type for the suggestRecipesFromIngredients function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRecipesFromIngredientsInputSchema = z.object({
  ingredients: z
    .array(z.string())
    .describe('A list of ingredients the user has available.'),
  dietaryPreferences: z
    .string()
    .optional()
    .describe('The dietary preferences of the user, e.g. vegetarian, vegan, gluten-free.'),
});
export type SuggestRecipesFromIngredientsInput =
  z.infer<typeof SuggestRecipesFromIngredientsInputSchema>;

const SuggestRecipesFromIngredientsOutputSchema = z.object({
  recipes: z
    .array(
      z.object({
        name: z.string().describe('The name of the recipe.'),
        ingredients: z.array(z.string()).describe('The ingredients required for the recipe, including quantities and units (e.g., "100g Chicken Breast").'),
        instructions: z.string().describe('The instructions for preparing the recipe.'),
      })
    )
    .describe('An array of 5 suggested recipes based on the available ingredients.'),
});
export type SuggestRecipesFromIngredientsOutput =
  z.infer<typeof SuggestRecipesFromIngredientsOutputSchema>;

export async function suggestRecipesFromIngredients(
  input: SuggestRecipesFromIngredientsInput
): Promise<SuggestRecipesFromIngredientsOutput> {
  return suggestRecipesFromIngredientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRecipesFromIngredientsPrompt',
  input: {schema: SuggestRecipesFromIngredientsInputSchema},
  output: {schema: SuggestRecipesFromIngredientsOutputSchema},
  prompt: `You are a recipe suggestion AI. Given a list of ingredients and optional dietary preferences,
you will suggest exactly 5 different recipes that the user can make.

Ingredients: {{{ingredients}}}
Dietary Preferences: {{{dietaryPreferences}}}

Suggest 5 recipes that utilize as many of the ingredients as possible.
Return the recipes in the following JSON format:
{{$instructions}}
`, config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const suggestRecipesFromIngredientsFlow = ai.defineFlow(
  {
    name: 'suggestRecipesFromIngredientsFlow',
    inputSchema: SuggestRecipesFromIngredientsInputSchema,
    outputSchema: SuggestRecipesFromIngredientsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
