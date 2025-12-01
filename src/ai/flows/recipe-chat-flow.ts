'use server';
/**
 * @fileOverview A conversational flow for helping users create recipes.
 */

import { ai } from '@/ai/genkit';
import { MessageData } from 'genkit';
import { RecipeChatInput, RecipeChatInputSchema, RecipeChatOutput, RecipeChatOutputSchema } from '@/lib/types';


export async function recipeChat(input: RecipeChatInput): Promise<RecipeChatOutput> {
  return await recipeChatFlow(input);
}

const recipeChatFlow = ai.defineFlow(
  {
    name: 'recipeChatFlow',
    inputSchema: RecipeChatInputSchema,
    outputSchema: RecipeChatOutputSchema,
  },
  async ({ history, message }) => {
    const systemPrompt = `Eres un asistente de cocina y nutricionista amable y servicial llamado NutriBot.
Tu objetivo es chatear con el usuario para ayudarle a crear una receta.
Habla siempre en español.
Guía al usuario haciendo preguntas para obtener los detalles necesarios (tipo de comida, ingredientes, restricciones dietéticas, tiempo de preparación, etc.).
Una vez que tengas suficiente información, presenta una receta completa con nombre, descripción, lista de ingredientes con cantidades y unidades, y los pasos de las instrucciones.
Cuando presentes la receta final, también debes proporcionar una estimación de los macronutrientes (calorías, proteínas, carbohidratos, grasas) y una 'imageHint' (dos o tres palabras clave en inglés para un generador de imágenes).
IMPORTANTÍSIMO: Cuando presentes la receta final, formatea ÚNICAMENTE la receta como un objeto JSON válido, sin ningún texto, markdown o explicación adicional antes o después. El JSON debe ser la ÚNICA cosa en tu respuesta final.

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
