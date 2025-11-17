'use server';
/**
 * @fileOverview Recipe suggestion flow that takes a list of ingredients and returns recipe suggestions.
 *
 * - suggestRecipes - A function that suggests recipes based on available ingredients and preferences.
 * - SuggestRecipesInput - The input type for the suggestRecipes function.
 * - SuggestRecipesOutput - The return type for the suggestRecipes function.
 */

import {ai, geminiPro} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRecipesInputSchema = z.object({
  ingredients: z.array(z.string()).describe('A list of ingredients the user has available.'),
  preferences: z.string().optional().describe('The user\'s preferences, e.g., "breakfast", "vegan", "low-carb".'),
});
export type SuggestRecipesInput = z.infer<typeof SuggestRecipesInputSchema>;

const RecipeSchema = z.object({
    name: z.string().describe('The name of the recipe.'),
    description: z.string().describe('A brief description of the recipe.'),
    instructions: z.string().describe('The instructions for preparing the recipe.'),
    calories: z.number().describe('Estimated total calories for the recipe.'),
    protein: z.number().describe('Estimated total protein in grams for the recipe.'),
    carbs: z.number().describe('Estimated total carbohydrates in grams for the recipe.'),
    fat: z.number().describe('Estimated total fat in grams for the recipe.'),
    ingredients: z
      .array(
        z.object({
          name: z.string().describe('Name of the ingredient.'),
          quantity: z.number().describe('Quantity of the ingredient.'),
          unit: z.string().describe('Unit of measurement (e.g., "g", "ml", "tbs").'),
        })
      )
      .describe('The ingredients required for the recipe.'),
});

const SuggestRecipesOutputSchema = z.object({
  recipes: z.array(RecipeSchema).describe('An array of 3 suggested recipes based on the provided inputs.'),
});
export type SuggestRecipesOutput = z.infer<typeof SuggestRecipesOutputSchema>;

export async function suggestRecipes(input: SuggestRecipesInput): Promise<SuggestRecipesOutput> {
  return suggestRecipesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRecipesPrompt',
  input: {schema: SuggestRecipesInputSchema},
  output: {schema: SuggestRecipesOutputSchema},
  prompt: `You are an expert chef AI. A user will provide a list of ingredients they have and optional dietary preferences.
Your task is to suggest exactly 3 creative and delicious recipes they can make.

User's Ingredients: {{{ingredients}}}
User's Preferences: {{{preferences}}}

Please provide the recipes in the specified JSON format. Ensure all fields are filled out accurately.
All the response must be in Spanish.
For the macros (calories, protein, carbs, fat), provide a reasonable estimate for a single serving of the recipe.
{{$instructions}}
`,
});

const suggestRecipesFlow = ai.defineFlow(
  {
    name: 'suggestRecipesFlow',
    inputSchema: SuggestRecipesInputSchema,
    outputSchema: SuggestRecipesOutputSchema,
  },
  async input => {
    const {output} = await ai.generate({
        model: geminiPro,
        prompt: prompt.render({input})
    });
    return output!;
  }
);
