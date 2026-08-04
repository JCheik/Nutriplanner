/**
 * Prompt fragments shared by every recipe-extraction surface (assistant recipe
 * generation, URL/text import, video analysis). NOT a 'use server' module on
 * purpose: server-action files may only export async functions, and these are
 * plain strings/helpers imported BY those files.
 */
import { z } from 'zod';

/**
 * The slice of the user's "entrevista nutricional" (Mi Laboratorio) that AI
 * flows consume. One shared schema so autocomplete/assistant/recipe-generation
 * never drift apart. All-optional wrapper: callers omit it when the interview
 * hasn't been filled in.
 */
export const NutriInterviewPromptSchema = z.object({
  favoriteFoods: z.array(z.string()),
  avoidFoods: z.array(z.string()),
  allergies: z.array(z.string()),
  weeklyWishes: z.object({
    legumbres: z.number().optional(),
    vegetariano: z.number().optional(),
    pescado: z.number().optional(),
  }),
  varietyPreference: z.enum(['variedad', 'repetir']),
  maxRepeatsPerRecipe: z.number().int().min(2).max(7).optional(),
  quickWeekdays: z.boolean(),
  freeMealsPerWeek: z.number().int().min(0).max(3).optional(),
  favoriteRecipes: z
    .array(z.object({ recipeId: z.string(), name: z.string(), perWeek: z.number().int().min(1).max(7) }))
    .optional(),
});
export type InterviewForPrompt = z.infer<typeof NutriInterviewPromptSchema>;

/**
 * Spanish prompt block describing the user's saved interview, for the
 * Spanish-language flows (assistant chat, recipe generation). Returns '' when
 * there is nothing useful to say. Allergies are rendered as an absolute ban;
 * dislikes can be overridden by an explicit user request in the moment.
 */
export function interviewInstruction(interview?: InterviewForPrompt | null): string {
  if (!interview) return '';
  const lines: string[] = [];
  if (interview.allergies.length > 0) {
    lines.push(`- ALERGIAS/INTOLERANCIAS (prohibición ABSOLUTA, por encima de todo lo demás): ${interview.allergies.join(', ')}. Nunca incluyas ni sugieras estos alimentos ni derivados.`);
  }
  if (interview.avoidFoods.length > 0) {
    lines.push(`- No le gustan / evita: ${interview.avoidFoods.join(', ')}. No los uses… salvo que el usuario los pida explícitamente en su mensaje (su petición del momento manda).`);
  }
  if (interview.favoriteFoods.length > 0) {
    lines.push(`- Le encantan: ${interview.favoriteFoods.join(', ')}. Úsalos como inspiración cuando encajen.`);
  }
  if (interview.favoriteRecipes?.length) {
    const list = interview.favoriteRecipes.map((r) => `"${r.name}" ×${r.perWeek}`).join(', ');
    lines.push(`- Platos fijos que quiere cada semana: ${list}. Son PLATOS CONCRETOS que ha elegido él, no una sugerencia: colócalos ese número de veces antes de rellenar con nada más.`);
  }
  const wishes: string[] = [];
  if (interview.weeklyWishes.legumbres) wishes.push(`${interview.weeklyWishes.legumbres}× legumbres`);
  if (interview.weeklyWishes.vegetariano) wishes.push(`${interview.weeklyWishes.vegetariano}× vegetariano`);
  if (interview.weeklyWishes.pescado) wishes.push(`${interview.weeklyWishes.pescado}× pescado`);
  if (wishes.length > 0) {
    lines.push(`- Cada semana quiere asegurar: ${wishes.join(', ')}.`);
  }
  lines.push(interview.varietyPreference === 'variedad'
    ? '- Prefiere máxima variedad entre platos.'
    : `- No le importa repetir platos (batch cooking), hasta ${interview.maxRepeatsPerRecipe ?? 3} veces la misma receta en la semana.`);
  if (interview.quickWeekdays) {
    lines.push('- Entre semana prefiere platos rápidos (~20 min o menos).');
  }
  if ((interview.freeMealsPerWeek ?? 0) > 0) {
    lines.push(`- Se reserva ${interview.freeMealsPerWeek} comida(s) libre(s) a la semana (comer fuera de plan es parte de su plan, no un fallo — nunca lo llames "trampa" ni generes culpa por ello).`);
  }
  return `SOBRE EL USUARIO (su entrevista nutricional guardada — tenla en cuenta en todo lo que respondas o crees):
${lines.join('\n')}`;
}

/**
 * Fragment with the existing ingredient-DB names, so the model reuses the exact
 * canonical name instead of minting near-duplicates ("claras de huevo" when
 * "clara de huevo" exists — the main source of duplicate foods). Capped to keep
 * the prompt bounded on very large databases.
 */
/**
 * Los alimentos que triplican su peso al cocerse necesitan decir en el NOMBRE
 * si están crudos o cocidos. Sin eso, "arroz blanco" con 350 kcal/100 g (que es
 * el crudo) se pesa cocido y salen casi el triple de calorías de las reales —
 * un error de bulto que ya se coló en recetas de usuario.
 */
export const COOK_STATE_RULE =
  'ESTADO (crudo/cocido) OBLIGATORIO en el nombre para arroz, pasta, legumbres (lentejas, garbanzos, alubias), quinoa, cuscús, bulgur, avena y demás cereales y granos: "arroz blanco cocido", "lenteja cruda". Nunca los dejes sin especificar, porque crudos rondan 330-380 kcal/100 g y cocidos 100-180, y confundirlos triplica las calorías. Elige el estado en el que la receta los PESA: si dice "200 g de arroz cocido", es cocido.';

export function existingIngredientsInstruction(names?: string[]): string {
  if (!names || names.length === 0) {
    return `REGLA DE NOMBRES DE INGREDIENTES: en singular, genérico y sin marca (ej: "clara de huevo", nunca "claras de huevo"). ${COOK_STATE_RULE}`;
  }
  const list = names.slice(0, 500).join('; ');
  return `ALIMENTOS YA EXISTENTES EN LA BASE DE DATOS:
${list}

REGLA DE NOMBRES DE INGREDIENTES: si un ingrediente de la receta ya está en esa lista (aunque el texto lo mencione en plural, con otra variante o con un sinónimo, p.ej. "cebolla lila" si existe "cebolla morada"), usa EXACTAMENTE el nombre de la lista. Solo usa un nombre nuevo si de verdad no existe: en singular, genérico y sin marca (ej: "clara de huevo", nunca "claras de huevo"). ${COOK_STATE_RULE}`;
}

/**
 * Units rule: ALL the macro math in the app assumes quantity is grams/ml
 * (kcal = cantidad/100 × per-100g), so piece units like "ud" would silently
 * compute as ~0 kcal.
 */
export const UNIT_RULE =
  'unit: SOLO "g" o "ml". NUNCA "ud", "taza", "cucharada" ni similares — convierte a gramos/ml y pon la cantidad ya convertida (1 huevo → 50 g; 1 clara → 30 g; 1 cucharada de aceite → 10 ml; 1 diente de ajo → 5 g; 1 taza de arroz cocido → 200 g).';
