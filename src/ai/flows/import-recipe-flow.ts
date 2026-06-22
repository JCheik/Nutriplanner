'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ImportRecipeInputSchema = z.object({
  url: z.string().optional(),
  caption: z.string().optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
});

const UnifiedIngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  // Per-100g nutritional values (estimated + self-validated by the model)
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  corrected: z.boolean(),
  note: z.string().optional(),
});

const UnifiedRecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
  servings: z.number().min(1),
  imageHint: z.string().optional(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  ingredients: z.array(UnifiedIngredientSchema),
});

export type UnifiedRecipe = z.infer<typeof UnifiedRecipeSchema>;
export type UnifiedIngredient = z.infer<typeof UnifiedIngredientSchema>;

const PROMPT = (contextLines: string) =>
  `Eres un chef nutricionista experto. Extrae la receta a partir del texto y estima los macros nutricionales.

${contextLines || 'Analiza el contenido multimedia adjunto.'}

INSTRUCCIONES:
1. Usa ÚNICAMENTE los ingredientes mencionados. NO añadas ingredientes que no estén en el texto.
2. Si las cantidades no están especificadas, usa estimaciones razonables para ese plato.
3. Para cada ingrediente, estima sus valores nutricionales POR 100g/100ml (no por la cantidad usada en la receta).
4. Auto-revisa las estimaciones con las referencias de abajo. Si corriges algo → corrected=true y nota breve en español. Si todo está bien → corrected=false.
5. Los macros TOTALES de la receta = suma de (cantidad/100 × macros_por_100g) para cada ingrediente.

REFERENCIAS NUTRICIONALES (por 100g):
- Aceites y grasas: 700–900 kcal | Frutos secos: 500–700 kcal
- Especias secas (pimienta, paprika, canela, etc.): 200–380 kcal — se usan 1–10g, NUNCA >20g en una receta
- Sal: 0 kcal | Azúcar: 400 kcal | Miel: 300 kcal
- Carnes y pescados: 100–350 kcal | Huevo: ~150 kcal
- Lácteos (leche, yogur): 40–100 kcal | Queso: 200–400 kcal
- Legumbres crudas: 300–380 kcal; cocidas: 100–150 kcal
- Cereales, pasta, arroz crudos: 330–380 kcal; cocidos: 120–180 kcal
- Frutas: 30–80 kcal | Verduras: 15–50 kcal (patata: ~80 kcal)

CANTIDADES RAZONABLES EN RECETAS:
- Especias y condimentos: 1–10g, NUNCA >20g | Sal: 1–10g | Aceite: 10–50ml
- Carne, pescado, tofu: 100–500g por receta | Cereales, arroz, pasta: 60–250g por receta
- Verduras: 50–500g | Huevos: 1–8 ud (50g/ud) | Lácteos líquidos: 50–500ml

Devuelve:
- name: nombre de la receta
- description: 1-2 frases apetecibles
- instructions: pasos numerados separados por \\n
- servings: raciones que produce
- imageHint: 2-3 palabras en inglés para búsqueda de imagen
- calories, protein, carbs, fat: totales de la receta completa
- ingredients: array. Cada uno:
  · id: "ing-1", "ing-2"...
  · name: en español, simple (ej: "pechuga de pollo")
  · quantity: cantidad en la receta (ya corregida si era errónea)
  · unit: g/ml/ud/taza/cucharada...
  · calories, protein, carbs, fat, fiber: POR 100g
  · corrected: true si corregiste algo, false si estaba bien
  · note: explicación breve si corrected=true, omitir si false`;

export const importRecipeFlow = ai.defineFlow(
  {
    name: 'importRecipeFlow',
    inputSchema: ImportRecipeInputSchema,
    outputSchema: UnifiedRecipeSchema,
  },
  async ({ url, caption, videoUrl, imageUrl }) => {
    const contextLines = [
      url && `URL de origen: ${url}`,
      caption && `Texto de la publicación:\n${caption}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const promptParts: ({ text: string } | { media: { url: string } })[] = [
      { text: PROMPT(contextLines) },
    ];
    if (videoUrl) {
      promptParts.push({ media: { url: videoUrl } });
    } else if (imageUrl) {
      promptParts.push({ media: { url: imageUrl } });
    }

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptParts,
      output: { schema: UnifiedRecipeSchema },
    });

    return response.output!;
  }
);
