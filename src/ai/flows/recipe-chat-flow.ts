'use server';
/**
 * @fileOverview A conversational flow for helping users create recipes.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { MessageData } from 'genkit';
import { RecipeChatInputSchema, RecipeChatOutputSchema, RecipeSchema } from '@/lib/types';
import type { RecipeChatInput, RecipeChatOutput, Recipe } from '@/lib/types';


export async function recipeChat(input: RecipeChatInput): Promise<RecipeChatOutput> {
  if (input.generateThree) {
    return await recipeSuggestionsFlow(input) as RecipeChatOutput;
  }
  return await recipeChatFlow(input);
}


const RecipeArraySchema = z.array(
  RecipeSchema.omit({ 
    id: true, 
    folderId: true,
    imageUrl: true, 
  })
);


const recipeSuggestionsFlow = ai.defineFlow(
  {
    name: 'recipeSuggestionsFlow',
    inputSchema: RecipeChatInputSchema,
    outputSchema: RecipeArraySchema,
  },
  async ({ message, nutritionalGoal }) => {

    const prompt = `
      Eres un asistente de cocina experto. El usuario quiere ideas de recetas.
      Basado en la siguiente preferencia del usuario: "${message}".
      ${nutritionalGoal ? `IMPORTANTE: El usuario tiene un objetivo nutricional diario. Intenta que CADA receta se ajuste a una porción razonable de estas macros: Calorías: ${nutritionalGoal.calories}, Proteínas: ${nutritionalGoal.protein}g, Carbohidratos: ${nutritionalGoal.carbs}g, Grasas: ${nutritionalGoal.fat}g. No tiene que ser exacto, pero sí una buena contribución a su día.` : ''}
      
      Tu ÚNICA Y EXCLUSIVA tarea es generar un array JSON con TRES (3) objetos de receta distintos.
      
      Cada objeto de receta en el array debe contener:
      - name: string (El nombre de la receta)
      - description: string (Una descripción corta y atractiva)
      - instructions: string (Los pasos de la preparación, separados por saltos de línea '\\n')
      - ingredients: Un array de objetos, donde cada objeto tiene 'name' (string), 'quantity' (number), y 'unit' (string).
      - calories: number (Estimación total de calorías)
      - protein: number (Estimación total de proteína en gramos)
      - carbs: number (Estimación total de carbohidratos en gramos)
      - fat: number (Estimación total de grasa en gramos)
      - imageHint: string (Dos o tres palabras clave en inglés para un generador de imágenes, ej: "lemon chicken", "greek salad")
      
      NO incluyas NINGÚN texto, saludo, explicación o markdown antes o después del array JSON.
      Tu respuesta DEBE empezar con '[' y terminar con ']'.
    `;

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: prompt,
      output: {
        schema: RecipeArraySchema,
      },
    });

    return llmResponse.output || [];
  }
);


const recipeChatFlow = ai.defineFlow(
  {
    name: 'recipeChatFlow',
    inputSchema: RecipeChatInputSchema,
    outputSchema: z.string(),
  },
  async ({ history, message, nutritionalGoal }) => {
    const systemPrompt = `Eres un asistente de cocina y nutricionista amable y servicial llamado NutriBot. Tu propósito es ayudar al usuario a crear una receta específica para su planificador de comidas.
Tu objetivo es chatear con el usuario para ayudarle a crear una receta.
Habla siempre en español.
Guía al usuario haciendo preguntas para obtener los detalles necesarios (tipo de comida, ingredientes, restricciones dietéticas, tiempo de preparación, etc.).
${nutritionalGoal ? `IMPORTANTE: El usuario tiene un objetivo nutricional diario. Intenta que la receta se ajuste a una porción razonable de estas macros: Calorías: ${nutritionalGoal.calories}, Proteínas: ${nutritionalGoal.protein}g, Carbohidratos: ${nutritionalGoal.carbs}g, Grasas: ${nutritionalGoal.fat}g. No tiene que ser exacto, pero sí una buena contribución a su día.` : ''}
Una vez que tengas suficiente información, presenta una receta completa con nombre, descripción, lista de ingredientes con cantidades y unidades, y los pasos de las instrucciones.
Cuando presentes la receta final, también debes proporcionar una estimación de los macronutrientes (calorías, proteínas, carbohidratos, grasas) y una 'imageHint' (dos o tres palabras clave en inglés para un generador de imágenes).
IMPORTANTÍSIMO: Cuando presentes la receta final, formatea ÚNICAMENTE la receta como un objeto JSON válido, sin ningún texto, markdown o explicación adicional antes o después. El JSON debe ser la ÚNICA cosa en tu respuesta final.
Tu objetivo es llegar a ese JSON. No hagas preguntas genéricas sobre lo que el usuario tiene en la nevera o para cuántas personas cocina; céntrate en definir la receta.
Si has tenido en cuenta un objetivo nutricional, puedes mencionarlo brevemente ANTES de decidir presentar el JSON final.

Ejemplo de cómo debe ser tu respuesta FINAL (solo el JSON):
{
  "name": "Pollo al Limón Rápido",
  "description": "Un plato de pollo jugoso y sabroso con un toque cítrico, perfecto para una cena entre semana.",
  "instructions": "1. Sazona el pollo con sal y pimienta.\\n2. Calienta el aceite en una sartén a fuego medio-alto.\\n3. Dora el pollo por ambos lados.\\n4. Añade el zumo de limón y el caldo, y cocina a fuego lento hasta que el pollo esté hecho.",
  "ingredients": [
    { "name": "Pechuga de pollo", "quantity": 200, "unit": "g" },
    { "name": "Aceite de oliva", "quantity": 15, "unit": "ml" },
    { "name": "Zumo de limón", "quantity": 30, "unit": "ml" },
    { "name": "Caldo de pollo", "quantity": 100, "unit": "ml" }
  ],
  "calories": 350,
  "protein": 40,
  "carbs": 5,
  "fat": 18,
  "imageHint": "lemon chicken"
}
`;

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      history: [
          { role: 'system', content: [{ text: systemPrompt }] },
          ...history
      ],
      prompt: message,
    });
    
    return llmResponse.text;
  }
);
