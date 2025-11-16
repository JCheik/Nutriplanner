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
import { ingredientsDB } from '@/lib/ingredients';

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

const SuggestedIngredientSchema = z.object({
  name: z.string().describe('The exact name of the ingredient from the provided database list.'),
  quantity: z.number().describe('The quantity of the ingredient.'),
  unit: z.string().describe('The unit for the quantity (e.g., g, ml, units).'),
});

const SuggestRecipesFromIngredientsOutputSchema = z.object({
  recipes: z
    .array(
      z.object({
        name: z.string().describe('The name of the recipe.'),
        ingredients: z.array(SuggestedIngredientSchema).describe('The ingredients required for the recipe. MUST use ingredients from the database.'),
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

const dbIngredientNames = ingredientsDB.map(i => i.name).join(', ');

const prompt = ai.definePrompt({
  name: 'suggestRecipesFromIngredientsPrompt',
  input: {schema: SuggestRecipesFromIngredientsInputSchema},
  output: {schema: SuggestRecipesFromIngredientsOutputSchema},
  prompt: `Eres una IA para sugerir recetas. Dada una lista de ingredientes y preferencias dietéticas opcionales,
sugerirás exactamente 5 recetas diferentes que el usuario puede hacer. Toda la respuesta debe estar en español.

MUY IMPORTANTE: Debes usar **única y exclusivamente** los siguientes ingredientes de la base de datos para crear las recetas:
${dbIngredientNames}

No inventes ingredientes ni uses variaciones (ej., si la base de datos dice "Aguacate", usa "Aguacate", no "Aguacate maduro").

Ingredientes que tiene el usuario: {{{ingredients}}}
Preferencias Dietéticas: {{{dietaryPreferences}}}

Sugiere 5 recetas que utilicen la mayor cantidad posible de los ingredientes que tiene el usuario.
Devuelve las recetas en el siguiente formato JSON:
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
