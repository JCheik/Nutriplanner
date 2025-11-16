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
        ingredients: z.array(z.string()).describe('The ingredients required for the recipe.'),
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
  prompt: `Eres una IA para sugerir recetas. Dada una lista de ingredientes y preferencias dietéticas opcionales,
sugerirás exactamente 5 recetas diferentes que el usuario puede hacer. Toda la respuesta debe estar en español.

Ingredientes que tiene el usuario: {{{ingredients}}}
Preferencias Dietéticas: {{{dietaryPreferences}}}

Sugiere 5 recetas que utilicen la mayor cantidad posible de los ingredientes que tiene el usuario.
Devuelve las recetas en el siguiente formato JSON:
{{$instructions}}
`,
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
