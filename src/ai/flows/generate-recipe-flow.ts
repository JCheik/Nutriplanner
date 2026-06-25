'use server';
/**
 * @fileOverview Generates a single recipe from a free-text description, honoring
 * the user's active nutritional goal and diet. Powers the unified assistant's
 * `create_recipe` action: the model returns a complete recipe and the client
 * opens it in the RecipeDialog for the user to review and save.
 *
 * Each ingredient also carries its estimated per-100g macros (same shape as the
 * URL import flow) so the recipe dialog can offer to add the ones missing from
 * the user's ingredient DB, instead of silently logging them as 0 kcal.
 *
 * Replaces the old conversational `recipe-chat-flow`: recipe creation is now one
 * capability of the single assistant, not a separate chatbot.
 */
import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'zod';
import { DIET_TAG_ENUM } from '@/lib/types';
import type { DietTag } from '@/lib/types';
import { DIET_TAG_LABELS } from '@/lib/constants';

const GoalMacrosSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

const GenerateRecipeInputSchema = z.object({
  description: z.string(),
  nutritionalGoal: GoalMacrosSchema.nullable().optional(),
  diet: z.array(z.enum(DIET_TAG_ENUM)).optional(),
});
export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

// Each ingredient carries its per-100g nutritional estimate (self-validated by
// the model) plus the quantity used in the recipe.
const GeneratedIngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  // Per-100g / 100ml values.
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  corrected: z.boolean(),
  note: z.string().optional(),
});

const GeneratedRecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
  ingredients: z.array(GeneratedIngredientSchema),
  // Totals for the whole recipe.
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  imageHint: z.string().optional(),
  servings: z.number().min(1).optional(),
  dietTags: z.array(z.enum(DIET_TAG_ENUM)).optional(),
});
export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;
export type GeneratedIngredient = z.infer<typeof GeneratedIngredientSchema>;

// Builds a prompt fragment that forces the recipe to honour the user's diet and
// to self-tag with the matching dietTags.
function dietInstruction(diet?: DietTag[]): string {
  if (!diet || diet.length === 0) return '';
  const labels = diet.map(d => DIET_TAG_LABELS[d] ?? d).join(', ');
  const values = diet.join('", "');
  return `El usuario sigue esta dieta: ${labels}. La receta DEBE cumplirla estrictamente e incluir "dietTags": ["${values}"].`;
}

const generateRecipeFlow = ai.defineFlow(
  {
    name: 'generateRecipeFlow',
    inputSchema: GenerateRecipeInputSchema,
    outputSchema: GeneratedRecipeSchema.nullable(),
  },
  async ({ description, nutritionalGoal, diet }) => {
    const prompt = `
Eres el asistente de cocina de NutriPlanner. Crea UNA receta a partir de la petición del usuario.

PETICIÓN: "${description}"
${nutritionalGoal ? `OBJETIVO NUTRICIONAL (referencia para una ración razonable): ${nutritionalGoal.calories} kcal, ${nutritionalGoal.protein}g proteína, ${nutritionalGoal.carbs}g carbohidratos, ${nutritionalGoal.fat}g grasa. No tiene que ser exacto, pero sí una contribución coherente al día.` : ''}
${dietInstruction(diet)}

Para cada ingrediente estima sus valores nutricionales POR 100g/100ml (no por la cantidad usada). Auto-revisa cada estimación con las referencias de abajo: si corriges algo → corrected=true y una nota breve en español; si está bien → corrected=false.

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

Devuelve SOLO el objeto de la receta con estos campos:
- name: nombre de la receta
- description: descripción corta y atractiva
- instructions: pasos de preparación separados por saltos de línea '\\n'
- servings: número de raciones que produce (1 si es individual)
- imageHint: dos o tres palabras clave en inglés para un generador de imágenes (p.ej. "lemon chicken")
- ingredients: array de objetos. Cada uno:
  · id: UUID aleatorio
  · name: en español, simple (ej: "pechuga de pollo")
  · quantity: cantidad en la receta (número)
  · unit: g/ml/ud/cucharada...
  · calories, protein, carbs, fat, fiber: POR 100g (no por la cantidad usada)
  · corrected: true si corregiste la estimación, false si estaba bien
  · note: explicación breve si corrected=true; omitir si false
- calories, protein, carbs, fat: estimación TOTAL de la receta = suma de (cantidad/100 × macros_por_100g) de cada ingrediente
${diet && diet.length > 0 ? `- dietTags: exactamente ["${diet.join('", "')}"]` : ''}

Usa cantidades realistas y valores nutricionales plausibles. No añadas texto fuera del objeto.
`.trim();

    const res = await ai.generate({
      model: GEMINI_MODEL,
      prompt,
      output: { schema: GeneratedRecipeSchema },
    });

    return res.output ?? null;
  }
);

export async function generateRecipe(input: GenerateRecipeInput): Promise<GeneratedRecipe | null> {
  return generateRecipeFlow(input);
}
