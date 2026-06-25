'use server';

import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'zod';
import { RecipeSchema } from '@/lib/types';

// Recipe shape the model returns (the canonical RecipeSchema minus app-assigned fields).
const RecipeArraySchema = z.array(
  RecipeSchema.omit({
    id: true,
    imageUrl: true,
  })
);

const ParseFridgeImageInputSchema = z.object({
  imageBase64: z.string(), // base64 data URL (e.g. data:image/jpeg;base64,...)
  nutritionalGoal: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).nullable().optional(),
});

const ParseFridgeImageOutputSchema = z.object({
  ingredients: z.array(z.string()),
  recipes: RecipeArraySchema,
});

const parseFridgeImageFlow = ai.defineFlow(
  {
    name: 'parseFridgeImageFlow',
    inputSchema: ParseFridgeImageInputSchema,
    outputSchema: ParseFridgeImageOutputSchema,
  },
  async ({ imageBase64, nutritionalGoal }) => {
    const prompt = `
      Analiza la imagen provista de la nevera o ingredientes de cocina.
      
      Tu tarea consiste en:
      1. Identificar todos los ingredientes y alimentos visibles en la imagen y listarlos en el campo 'ingredients' (en español).
      2. Generar TRES (3) recetas saludables y creativas utilizando principalmente los ingredientes identificados en la imagen (puedes asumir ingredientes básicos de despensa como sal, pimienta, aceite, etc.).
      
      ${nutritionalGoal ? `IMPORTANTE: El usuario tiene un objetivo nutricional diario. Intenta que CADA receta se ajuste a una porción razonable de estas macros: Calorías: ${nutritionalGoal.calories}, Proteínas: ${nutritionalGoal.protein}g, Carbohidratos: ${nutritionalGoal.carbs}g, Grasas: ${nutritionalGoal.fat}g. No tiene que ser exacto, pero sí una buena contribución a su día.` : ''}
      
      Cada objeto de receta en el array de 'recipes' debe contener:
      - name: string (El nombre de la receta)
      - description: string (Una descripción corta y atractiva)
      - instructions: string (Los pasos de la preparación, separados por saltos de línea '\\n')
      - ingredients: Un array de objetos, donde cada objeto tiene 'id' (un UUID aleatorio), 'name' (string), 'quantity' (number), y 'unit' (string).
      - calories: number (Estimación total de calorías)
      - protein: number (Estimación total de proteína en gramos)
      - carbs: number (Estimación total de carbohidratos en gramos)
      - fat: number (Estimación total de grasa en gramos)
      - imageHint: string (Dos o tres palabras clave en inglés para un generador de imágenes, ej: "lemon chicken", "greek salad")
      
      Devuelve un objeto JSON estructurado que cumpla con el esquema requerido.
    `;

    const response = await ai.generate({
      model: GEMINI_MODEL,
      prompt: [
        { text: prompt },
        { media: { url: imageBase64 } }
      ],
      output: {
        schema: ParseFridgeImageOutputSchema,
      },
    });

    return response.output || { ingredients: [], recipes: [] };
  }
);

export async function parseFridgeImage(input: {
  imageBase64: string;
  nutritionalGoal?: { calories: number; protein: number; carbs: number; fat: number } | null;
}) {
  return parseFridgeImageFlow(input);
}
