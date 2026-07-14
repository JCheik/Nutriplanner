/**
 * Prompt fragments shared by every recipe-extraction surface (assistant recipe
 * generation, URL/text import, video analysis). NOT a 'use server' module on
 * purpose: server-action files may only export async functions, and these are
 * plain strings/helpers imported BY those files.
 */

/**
 * Fragment with the existing ingredient-DB names, so the model reuses the exact
 * canonical name instead of minting near-duplicates ("claras de huevo" when
 * "clara de huevo" exists — the main source of duplicate foods). Capped to keep
 * the prompt bounded on very large databases.
 */
export function existingIngredientsInstruction(names?: string[]): string {
  if (!names || names.length === 0) {
    return 'REGLA DE NOMBRES DE INGREDIENTES: en singular, genérico y sin marca (ej: "clara de huevo", nunca "claras de huevo").';
  }
  const list = names.slice(0, 500).join('; ');
  return `ALIMENTOS YA EXISTENTES EN LA BASE DE DATOS:
${list}

REGLA DE NOMBRES DE INGREDIENTES: si un ingrediente de la receta ya está en esa lista (aunque el texto lo mencione en plural, con otra variante o con un sinónimo, p.ej. "cebolla lila" si existe "cebolla morada"), usa EXACTAMENTE el nombre de la lista. Solo usa un nombre nuevo si de verdad no existe: en singular, genérico y sin marca (ej: "clara de huevo", nunca "claras de huevo").`;
}

/**
 * Units rule: ALL the macro math in the app assumes quantity is grams/ml
 * (kcal = cantidad/100 × per-100g), so piece units like "ud" would silently
 * compute as ~0 kcal.
 */
export const UNIT_RULE =
  'unit: SOLO "g" o "ml". NUNCA "ud", "taza", "cucharada" ni similares — convierte a gramos/ml y pon la cantidad ya convertida (1 huevo → 50 g; 1 clara → 30 g; 1 cucharada de aceite → 10 ml; 1 diente de ajo → 5 g; 1 taza de arroz cocido → 200 g).';
