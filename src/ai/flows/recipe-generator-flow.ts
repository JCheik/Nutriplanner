
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

const RecipeGenerationInputSchema = z.object({
  prompt: z.string().describe('The user\'s request for a recipe (e.g., "a high-protein vegan breakfast").'),
});
export type RecipeGenerationInput = z.infer<typeof RecipeGenerationInputSchema>;

// Define a Zod schema for a single ingredient to be used in the output
const IngredientSchema = z.object({
    name: z.string().describe('The name of the ingredient.'),
    quantity: z.number().describe('The amount of the ingredient.'),
    unit: z.string().describe('The unit of measurement for the quantity (e.g., "g", "ml", "cup").'),
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
  // Directly call the flow function with the input object
  return await recipeGeneratorFlow(input);
}


const recipeGeneratorFlow = ai.defineFlow(
  {
    name: 'recipeGeneratorFlow',
    inputSchema: RecipeGenerationInputSchema,
    outputSchema: RecipeGenerationOutputSchema,
  },
  async ({ prompt }) => {
    
    const llmResponse = await ai.generate({
        model: 'googleai/gemini-1.0-pro',
        prompt: `You are an expert chef and nutritionist. Your task is to generate a recipe based on a user's request.

        User request: ${prompt}

        You MUST respond with a valid JSON object that conforms to the following structure. Do not include any text, markdown, or formatting outside of the JSON object.
        
        The JSON structure required is:
        {
          "name": "string",
          "description": "string",
          "instructions": "string (with newlines for steps)",
          "ingredients": [ { "name": "string", "quantity": number, "unit": "string" } ],
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "imageHint": "string (two or three words)"
        }`,
    });
    
    try {
        const jsonText = llmResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const output = JSON.parse(jsonText);
        // Validate the parsed object against the Zod schema to be safe
        return RecipeGenerationOutputSchema.parse(output);
    } catch (e) {
        console.error("Failed to parse LLM response as JSON:", e);
        console.error("LLM Raw Response:", llmResponse.text);
        throw new Error('Failed to generate a valid recipe structure from AI.');
    }
  }
);
