'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const IngredientToValidateSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  // Per-100g estimates (for missing ingredients only; 0 for DB ingredients)
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  isMissing: z.boolean(),
});

const ValidatedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  corrected: z.boolean(),
  note: z.string().optional(),
});

const ValidateInputSchema = z.object({
  ingredients: z.array(IngredientToValidateSchema),
});

const ValidateOutputSchema = z.array(ValidatedIngredientSchema);

export const validateRecipeFlow = ai.defineFlow(
  {
    name: 'validateRecipeFlow',
    inputSchema: ValidateInputSchema,
    outputSchema: ValidateOutputSchema,
  },
  async ({ ingredients }) => {
    const prompt = `Eres un nutricionista experto que revisa listas de ingredientes para detectar errores nutricionales y de cantidad.

Ingredientes a revisar:
${JSON.stringify(ingredients, null, 2)}

REFERENCIAS NUTRICIONALES (valores por 100g):
- Aceites y grasas: 700–900 kcal
- Frutos secos y semillas: 500–700 kcal
- Especias secas (pimienta, paprika, canela, comino, orégano, etc.): 200–380 kcal — pero se usan 1–10g en una receta
- Sal: 0 kcal
- Ajo en polvo/cebolla en polvo: 300–350 kcal por 100g
- Carnes y pescados: 100–350 kcal
- Huevo: ~150 kcal
- Leche, yogur: 40–100 kcal; queso: 200–400 kcal
- Legumbres crudas: 300–380 kcal; cocidas: 100–150 kcal
- Cereales, pasta, arroz (crudos): 330–380 kcal; (cocidos): 120–180 kcal
- Pan: 240–280 kcal
- Frutas: 30–80 kcal
- Verduras y hortalizas: 15–50 kcal (patata: ~80 kcal)
- Azúcar: 400 kcal; miel: 300 kcal
- Caldo: 10–30 kcal; vino: 70 kcal

CANTIDADES RAZONABLES EN RECETAS:
- Especias y condimentos (pimienta, paprika, canela, etc.): 1–10g, NUNCA más de 20g
- Sal: 1–10g
- Aceite: 10–50ml
- Ajo fresco: 2–20g (1–4 dientes)
- Hierbas frescas (perejil, cilantro): 5–30g
- Carne, pescado, tofu: 100–500g por receta
- Cereales, arroz, pasta: 60–250g por receta completa
- Verduras: 50–500g
- Lácteos líquidos: 50–500ml
- Huevos: 1–8 unidades (50g/ud)

REGLAS:
1. Para TODOS los ingredientes (isMissing=true y false): comprueba que la cantidad sea razonable. Corrige si es claramente errónea.
2. Solo para ingredientes con isMissing=true: también verifica que los valores nutricionales por 100g sean realistas.
3. Si corriges algo → pon corrected=true y una nota breve explicando el cambio (en español).
4. Si todo está bien → corrected=false, note vacía o nula.
5. Mantén el mismo nombre de ingrediente sin cambiarlo.

Devuelve ÚNICAMENTE el JSON array con exactamente ${ingredients.length} elementos en el mismo orden.`;

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: ValidateOutputSchema },
    });

    return response.output || ingredients.map((ing) => ({ ...ing, corrected: false }));
  }
);
