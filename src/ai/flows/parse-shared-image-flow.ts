'use server';

import { z } from 'zod';

import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { existingIngredientsInstruction, UNIT_RULE } from '@/ai/prompt-fragments';

/**
 * Qué hay en una imagen compartida con Nutrilp.
 *
 * Existe porque **Instagram no sirve el contenido de un post a nadie sin sesión
 * iniciada**: pedirle el enlace desde el servidor devuelve la palabra
 * "Instagram" y nada más (medido con reels reales). El enlace, para Instagram,
 * es un callejón sin salida.
 *
 * Lo que sí llega es una **captura de pantalla**: ahí está el pie de foto con la
 * receta, y a menudo el plato. Leerla es la única forma fiable de importar de
 * Instagram, y es un gesto que el usuario ya sabe hacer.
 *
 * Clasifica y extrae en UNA llamada. Compartir una foto de la nevera es una
 * función que ya existía y no se puede romper, así que el modelo decide primero
 * qué tiene delante y solo después extrae.
 */

const IngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
});

const OutputSchema = z.object({
  /**
   * `receta` = un post, una captura o una foto de una receta escrita.
   * `nevera` = comida suelta, la nevera abierta, la compra encima de la mesa.
   * `ninguna` = ni una cosa ni la otra.
   */
  kind: z.enum(['receta', 'nevera', 'ninguna']),
  /** Por qué no era ninguna de las dos. Solo con `kind: 'ninguna'`. */
  motivo: z.string().optional(),
  /** Solo con `kind: 'receta'`. Mismo shape que el resto de importaciones. */
  recipe: z
    .object({
      name: z.string(),
      description: z.string(),
      instructions: z.string(),
      servings: z.number().optional(),
      imageHint: z.string().optional(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      category: z.array(z.string()).optional(),
      dietTags: z.array(z.string()).optional(),
      ingredients: z.array(IngredientSchema),
    })
    .optional(),
});

export type SharedImageResult = z.infer<typeof OutputSchema>;

const PROMPT = (existingIngredients?: string[]) => `Eres un chef nutricionista experto. Te comparten una IMAGEN desde el móvil y tienes que decidir qué es y sacarle partido.

${existingIngredientsInstruction(existingIngredients)}

PASO 1 — DECIDE QUÉ ES:
· kind="receta" si la imagen enseña una receta: una captura de un post de
  Instagram o TikTok con su texto, una foto de una página de libro o de una
  ficha de receta, una lista de ingredientes escrita, una captura de una web de
  cocina. **Lee TODO el texto que haya en la imagen**, incluido el pie de foto
  recortado, los rótulos sobre el vídeo y lo que esté en letra pequeña.
· kind="nevera" si es comida SIN receta: la nevera abierta, la despensa, la
  compra sobre la mesa, ingredientes sueltos. Aquí no hay nada que leer, solo
  alimentos que reconocer.
· kind="ninguna" si no va de comida. Rellena motivo con una frase corta.

Ante la duda entre "receta" y "nevera": si hay TEXTO que describa un plato, es
receta. Si solo hay comida a la vista, es nevera.

PASO 2 — SI ES RECETA, EXTRÁELA:
1. Usa lo que ponga la imagen. Si el texto está cortado, complétalo con lo que se
   vea en la foto del plato, pero no inventes ingredientes que no sugiera nada.
2. Si no vienen los pasos —lo normal en un pie de Instagram—, **escríbelos tú**
   para ese plato. No es motivo para rechazarla.
3. Cantidades: si no se indican, estima las razonables para el plato.
4. Para cada ingrediente, estima sus valores POR 100 g/100 ml.
5. Los macros TOTALES = suma de (cantidad/100 × macros_por_100g).

REFERENCIAS (por 100g):
- Aceites: 700–900 kcal | Frutos secos: 500–700 kcal
- Especias secas: 200–380 kcal — 1–10 g, NUNCA >20 g en una receta
- Sal: 0 kcal | Azúcar: 400 kcal | Miel: 300 kcal
- Carnes/pescado: 100–350 kcal | Huevo: ~150 kcal
- Lácteos: 40–100 kcal | Queso: 200–400 kcal
- Legumbres crudas: 300–380; cocidas: 100–150
- Cereales/pasta/arroz crudos: 330–380; cocidos: 120–180
- Frutas: 30–80 | Verduras: 15–50 (patata: ~80)

Con kind="receta" devuelve el campo "recipe" con: name, description (1-2 frases),
instructions (pasos separados por \\n), servings, imageHint (2-3 palabras en
inglés), category (desayuno/almuerzo/merienda/cena/snack/postre/otro),
dietTags (omnivora/vegetariana/vegana/keto/low_carb/sin_gluten/sin_lactosa;
vacío si ninguna es segura), calories/protein/carbs/fat totales, e ingredients
con id ("ing-1"...), name en español siguiendo la REGLA DE NOMBRES,
quantity en gramos/ml, ${UNIT_RULE} y calories/protein/carbs/fat/fiber POR 100 g.

Con kind="nevera" o "ninguna", deja "recipe" sin rellenar.`;

const flow = ai.defineFlow(
  {
    name: 'parseSharedImageFlow',
    inputSchema: z.object({
      /** data URL: data:image/jpeg;base64,… */
      imageBase64: z.string(),
      existingIngredients: z.array(z.string()).optional(),
    }),
    outputSchema: OutputSchema,
  },
  async ({ imageBase64, existingIngredients }) => {
    const { output } = await ai.generate({
      model: GEMINI_MODEL,
      prompt: [{ text: PROMPT(existingIngredients) }, { media: { url: imageBase64 } }],
      output: { schema: OutputSchema },
    });
    return output ?? { kind: 'ninguna' as const, motivo: 'No pude interpretar la imagen.' };
  }
);

export async function parseSharedImage(input: {
  imageBase64: string;
  existingIngredients?: string[];
}): Promise<SharedImageResult> {
  return flow(input);
}
