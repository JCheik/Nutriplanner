'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const EstimateInputSchema = z.object({
  ingredientNames: z.array(z.string()),
});

export const EstimatedIngredientSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
});

export type EstimatedIngredient = z.infer<typeof EstimatedIngredientSchema>;

const EstimateOutputSchema = z.array(EstimatedIngredientSchema);

export const estimateIngredientMacrosFlow = ai.defineFlow(
  {
    name: 'estimateIngredientMacrosFlow',
    inputSchema: EstimateInputSchema,
    outputSchema: EstimateOutputSchema,
  },
  async ({ ingredientNames }) => {
    if (ingredientNames.length === 0) return [];

    const prompt = `Eres un nutricionista experto con acceso a bases de datos nutricionales estándar (USDA, BEDCA).

Para cada uno de los siguientes alimentos, proporciona los macronutrientes por 100g o 100ml:

Alimentos: ${ingredientNames.join(', ')}

Para cada alimento devuelve un objeto con:
- name: nombre del alimento (exactamente como se recibió)
- calories: kcal por 100g/100ml
- protein: gramos de proteína por 100g/100ml
- carbs: gramos de carbohidratos por 100g/100ml
- fat: gramos de grasa por 100g/100ml
- fiber: gramos de fibra por 100g/100ml

Usa valores medios realistas basados en el alimento en su estado más común (crudo si es habitual comerlo cocinado, ya que se pesa crudo). Devuelve un array JSON con todos los alimentos. Sin texto adicional.`;

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: EstimateOutputSchema },
    });

    return response.output || [];
  }
);
