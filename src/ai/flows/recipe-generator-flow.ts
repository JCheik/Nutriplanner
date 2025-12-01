'use server';
/**
 * @fileOverview A flow for generating recipes using AI.
 *
 * - generateRecipe - A function that handles the recipe generation process.
 * - RecipeGenerationInput - The input type for the generateRecipe function.
 * - RecipeGenerationOutput - The return type for the generateRecipe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Ingredient } from '@/lib/types';

const RecipeGenerationInputSchema = z.object({
  prompt: z.string().describe('The user\'s request for a recipe (e.g., "a high-protein vegan breakfast").'),
});
export type RecipeGenerationInput = z.infer<typeof RecipeGenerationInputSchema>;

// Define a Zod schema for a single ingredient to be used in the output
const IngredientSchema = z.object({
    name: z.string().describe('The name of the ingredient.'),
    quantity: z.number().describe('The amount of the ingredient.'),
    unit: z.string().describe('The unit of measurement for the quantity (e.g., "g", "ml", "taza").'),
});

const RecipeGenerationOutputSchema = z.object({
    name: z.string().describe('A creative and descriptive name for the recipe.'),
    description: z.string().describe('A brief, appetizing description of the dish.'),
    instructions: z.string().describe('Step-by-step preparation instructions, formatted with newlines.'),
    ingredients: z.array(IngredientSchema).describe('A list of all ingredients required for the recipe.'),
    calories: z.number().describe('The estimated total calories for the recipe.'),
    protein: z.number().describe('The estimated total protein in grams.'),
    carbs: z.number().describe('The estimated total carbohydrates in grams.'),
    fat: z.number().describe('The estimated total fat in grams.'),
    imageHint: z.string().describe('Two or three keywords for an AI image generator to create a picture of this dish (e.g., "salmon asparagus").'),
});
export type RecipeGenerationOutput = z.infer<typeof RecipeGenerationOutputSchema>;

// This is the function that will be called from the client
export async function generateRecipe(input: RecipeGenerationInput): Promise<RecipeGenerationOutput> {
  const recipeGenFlow = ai.getFlow('recipeGeneratorFlow');
  const response = await recipeGenFlow.run(input.prompt);
  return response.output!;
}

const prompt = ai.definePrompt({
  name: 'recipeGeneratorPrompt',
  input: {schema: z.string()},
  output: {schema: RecipeGenerationOutputSchema},
  prompt: `You are an expert chef and nutritionist. Your task is to generate a recipe based on a user's request.

  User request: {{{prompt}}}

  Generate a complete recipe that includes:
  1.  A creative and fitting name for the dish.
  2.  A short, enticing description.
  3.  A list of ingredients with quantities and units (e.g., grams, ml, cups).
  4.  Clear, step-by-step instructions.
  5.  An estimated nutritional breakdown for the total recipe (calories, protein, carbs, fat).
  6.  A simple two or three-word hint for an AI image generator.

  Ensure the output is in the specified JSON format. Be realistic with nutritional estimates.`,
});

const recipeGeneratorFlow = ai.defineFlow(
  {
    name: 'recipeGeneratorFlow',
    inputSchema: z.string(),
    outputSchema: RecipeGenerationOutputSchema,
  },
  async promptText => {
    const {output} = await prompt(promptText);
    if (!output) {
      throw new Error('Failed to generate recipe from prompt');
    }
    // Transform ingredients to match the application's Ingredient type
    const transformedIngredients = output.ingredients.map(ing => ({
      ...ing,
      id: self.crypto.randomUUID(), // Add the required 'id' field
    }));

    return {
      ...output,
      ingredients: transformedIngredients,
    };
  }
);
