// Copiado de la web (src/lib/utils.ts) SIN cn() (helper de Tailwind, solo-web).
// Mantener en sincronía con la web hasta que exista un paquete compartido.

/**
 * Normalizes a string for searching by converting it to lowercase and removing diacritics (accents).
 * @param text The text to normalize.
 * @returns The normalized string.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD") // Decomposes combined graphemes into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, ""); // Removes the diacritics
}

/**
 * Identity key for an ingredient, combining its name and optional brand so two
 * products with the same name but different brands (e.g. "yogur natural" from
 * Hacendado vs. Danone) resolve to different base ingredients and don't clash
 * in the lookup maps. Falls back to name-only when there's no brand, which keeps
 * it backward-compatible with ingredients saved before brands existed.
 */
export function ingredientKey(name: string, brand?: string): string {
  const n = normalizeText(name);
  const b = normalizeText(brand ?? '');
  return b ? `${n}||${b}` : n;
}

/**
 * Naive Spanish pluralization for a piece-unit label ("loncha" → "lonchas").
 * Weight/volume units ('g', 'ml') should not be passed through this.
 */
export function pluralizeUnit(unit: string, quantity: number): string {
  if (quantity === 1 || !unit) return unit;
  // Common abbreviations pluralize by adding "s", not the "-es" rule below
  // ("ud" → "uds", not "udes").
  if (/^(ud|u|uds)$/i.test(unit)) return unit.toLowerCase() === 'uds' ? unit : `${unit}s`;
  return /[aeiouáéíóú]$/i.test(unit) ? `${unit}s` : `${unit}es`;
}

    