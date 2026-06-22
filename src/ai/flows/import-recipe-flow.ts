'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ImportRecipeInputSchema = z.object({
  url: z.string().optional(),
  caption: z.string().optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const ImportedRecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
  ingredients: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
    })
  ),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  servings: z.number().min(1),
  imageHint: z.string().optional(),
});

export type ImportedRecipe = z.infer<typeof ImportedRecipeSchema>;

export const importRecipeFlow = ai.defineFlow(
  {
    name: 'importRecipeFlow',
    inputSchema: ImportRecipeInputSchema,
    outputSchema: ImportedRecipeSchema,
  },
  async ({ url, caption, videoUrl, imageUrl }) => {
    const contextLines = [
      url && `URL de origen: ${url}`,
      caption && `Descripción/caption de la publicación:\n${caption}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const hasMedia = !!(videoUrl || imageUrl);

    const prompt = `Eres un chef nutricionista experto. Tu tarea es extraer una receta completa y detallada a partir del contenido proporcionado (vídeo, imagen o texto).

${contextLines || 'Analiza el contenido multimedia adjunto.'}

${hasMedia ? 'El contenido multimedia adjunto puede contener pasos de preparación, ingredientes con cantidades exactas y tiempos de cocción. Extrae TODA la información posible del vídeo o imagen.' : ''}

Extrae y devuelve:
- name: nombre de la receta en español
- description: descripción corta y apetecible (1-2 frases)
- instructions: pasos de preparación numerados, separados por saltos de línea. Sé detallado.
- ingredients: array de ingredientes. Cada uno con:
  - id: UUID único (usa crypto.randomUUID() mentally, just a unique string like "ing-1", "ing-2", etc.)
  - name: nombre del ingrediente en español (singular, sin cantidad)
  - quantity: cantidad numérica
  - unit: unidad (g, ml, ud, taza, cucharada, cucharadita, diente, etc.)
- calories: calorías totales de la receta completa (kcal)
- protein: proteína total (g)
- carbs: carbohidratos totales (g)
- fat: grasa total (g)
- servings: número de raciones que produce esta receta
- imageHint: 2-3 palabras en inglés para buscar una imagen representativa (ej: "pasta carbonara", "chicken salad")

Si no puedes determinar las cantidades exactas, usa estimaciones razonables.
Para los macros, calcula el total de la receta completa (no por ración).
Devuelve ÚNICAMENTE el JSON, sin texto adicional.`;

    const promptParts: ({ text: string } | { media: { url: string } })[] = [{ text: prompt }];
    if (videoUrl) {
      promptParts.push({ media: { url: videoUrl } });
    } else if (imageUrl) {
      promptParts.push({ media: { url: imageUrl } });
    }

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptParts,
      output: { schema: ImportedRecipeSchema },
    });

    return response.output!;
  }
);
