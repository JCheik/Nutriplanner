
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
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebase } from '@/firebase/server-init';

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
    
    // Initialize Firebase Admin to get Firestore access on the server
    initializeFirebase();
    const firestore = getFirestore();
    
    // Fetch the list of available ingredients from Firestore
    const ingredientsSnapshot = await firestore.collection('ingredients').get();
    const availableIngredients = ingredientsSnapshot.docs.map(doc => doc.data().name);
    const availableIngredientsString = availableIngredients.join(', ');

    const llmResponse = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: `Eres un chef experto y nutricionista. Tu tarea es generar una receta basada en la petición de un usuario.
        TODA la respuesta, incluyendo nombres, descripciones e instrucciones, DEBE estar en ESPAÑOL.

        MUY IMPORTANTE: Debes usar SOLAMENTE los ingredientes de la siguiente lista para crear la receta:
        Lista de Ingredientes Disponibles: ${availableIngredientsString}

        Petición del usuario: ${prompt}

        DEBES responder con un objeto JSON válido que se ajuste a la siguiente estructura. No incluyas ningún texto, markdown o formato fuera del objeto JSON.
        
        La estructura JSON requerida es:
        {
          "name": "string (en español)",
          "description": "string (en español)",
          "instructions": "string (en español, con saltos de línea para los pasos)",
          "ingredients": [ { "name": "string (nombre exacto de la lista)", "quantity": number, "unit": "string (g, ml, o unidad)" } ],
          "calories": number (calculado basado en los ingredientes),
          "protein": number (calculado basado en los ingredientes),
          "carbs": number (calculado basado en los ingredientes),
          "fat": number (calculado basado en los ingredientes),
          "imageHint": "string (dos o tres palabras clave en inglés para un generador de imágenes)"
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
