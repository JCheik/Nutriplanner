'use server';

import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'zod';
import { MEAL_CATEGORY_ENUM, DIET_TAG_ENUM } from '@/lib/types';
import { existingIngredientsInstruction, UNIT_RULE } from '@/ai/prompt-fragments';

const ImportRecipeInputSchema = z.object({
  url: z.string().optional(),
  caption: z.string().optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  // Existing ingredient-DB names; the model reuses them verbatim to avoid dupes.
  existingIngredients: z.array(z.string()).optional(),
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
  /**
   * Salida de emergencia: sin esto el esquema obliga a devolver una receta, y
   * ante un texto que no va de cocina el modelo se la inventa. Opcional para
   * no romper respuestas viejas; se trata como `true` si falta.
   */
  esReceta: z.boolean().optional(),
  motivoNoReceta: z.string().optional(),
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
  // Guessed from the recipe itself (or an explicit "CATEGORÍA/DIETA SUGERIDA"
  // hint in the pasted text). Prefills the form's category/diet chips so bulk
  // imports don't all need manual tagging — still editable/removable there.
  category: z.array(z.enum(MEAL_CATEGORY_ENUM)).optional(),
  dietTags: z.array(z.enum(DIET_TAG_ENUM)).optional(),
});

export type UnifiedRecipe = z.infer<typeof UnifiedRecipeSchema>;
export type UnifiedIngredient = z.infer<typeof UnifiedIngredientSchema>;

const PROMPT = (contextLines: string, existingIngredients?: string[]) =>
  `Eres un chef nutricionista experto. Extrae la receta a partir del texto y estima los macros nutricionales.

${contextLines || 'Analiza el contenido multimedia adjunto.'}

${existingIngredientsInstruction(existingIngredients)}

INSTRUCCIONES:
0. ANTES DE NADA: decide si aquí hay una receta que extraer.
   · esReceta=false SOLO si el contenido no va de cocinar un plato: una rutina de
     gimnasio, una noticia, humor, un viaje, una reseña de un sitio, o comida
     mencionada de pasada sin un solo ingrediente identificable. Rellena
     motivoNoReceta con una frase corta de qué es y DEJA EL RESTO VACÍO.
   · Si hay un plato identificable y puedes deducir sus ingredientes, ES RECETA
     — **aunque no vengan los pasos**. Los pies de Instagram y TikTok casi nunca
     traen la preparación escrita: son una lista de ingredientes y poco más. Ahí
     escribe tú unos pasos razonables para ese plato; NO lo rechaces por eso.
   · Ante la duda entre extraerla o rechazarla, EXTRÁELA. Una receta con algún
     dato flojo el usuario la corrige en dos toques; la que rechazas, la pierde.
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
- category: array con 1 o más de "desayuno", "almuerzo", "merienda", "cena", "snack", "postre", "otro".
  Si el texto trae una línea "CATEGORÍA SUGERIDA:", úsala como base (traduce a estos valores exactos).
  Si no, dedúcela tú del plato (p.ej. tortitas/avena → desayuno; guiso/pasta → almuerzo/cena; tarta/bizcocho → postre).
  Incluye SIEMPRE al menos una.
- dietTags: array con 0 o más de "omnivora", "vegetariana", "vegana", "keto", "low_carb", "sin_gluten", "sin_lactosa".
  Si el texto trae una línea "DIETA SUGERIDA:", úsala. Si no, dedúcela de los ingredientes (sin carne/pescado →
  vegetariana; sin ningún producto animal → vegana; sin gluten si no hay trigo/cebada/centeno/pasta/pan normal; etc.).
  Vacío si no aplica ninguna con certeza — no fuerces una etiqueta dudosa.
- calories, protein, carbs, fat: totales de la receta completa
- ingredients: array. Cada uno:
  · id: "ing-1", "ing-2"...
  · name: en español, siguiendo la REGLA DE NOMBRES DE INGREDIENTES de arriba
  · quantity: cantidad en la receta en gramos/ml (ya corregida si era errónea)
  · ${UNIT_RULE}
  · calories, protein, carbs, fat, fiber: POR 100g
  · corrected: true si corregiste algo, false si estaba bien
  · note: explicación breve si corrected=true, omitir si false
- esReceta: false SOLO si esto no era una receta (ver instrucción 0), y entonces
  motivoNoReceta con el porqué`;

const importRecipeFlow = ai.defineFlow(
  {
    name: 'importRecipeFlow',
    inputSchema: ImportRecipeInputSchema,
    outputSchema: UnifiedRecipeSchema,
  },
  async ({ url, caption, videoUrl, imageUrl, existingIngredients }) => {
    const contextLines = [
      url && `URL de origen: ${url}`,
      caption && `Texto de la publicación:\n${caption}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const promptParts: ({ text: string } | { media: { url: string } })[] = [
      { text: PROMPT(contextLines, existingIngredients) },
    ];
    if (videoUrl) {
      promptParts.push({ media: { url: videoUrl } });
    } else if (imageUrl) {
      promptParts.push({ media: { url: imageUrl } });
    }

    const response = await ai.generate({
      model: GEMINI_MODEL,
      prompt: promptParts,
      output: { schema: UnifiedRecipeSchema },
    });

    return response.output!;
  }
);

export async function importRecipe(input: {
  url?: string;
  caption?: string;
  videoUrl?: string;
  imageUrl?: string;
  existingIngredients?: string[];
}): Promise<UnifiedRecipe> {
  return importRecipeFlow(input);
}
