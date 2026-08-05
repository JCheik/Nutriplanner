import { normalizeText } from '@/lib/utils';

/**
 * Expansión de alergias a los alimentos concretos que las contienen.
 *
 * Quien escribe "frutos secos" en la entrevista no espera tener que enumerar
 * almendra, nuez, anacardo… pero un filtro necesita esos nombres para poder
 * comparar contra la lista de ingredientes de una receta.
 *
 * Es un diccionario a mano y NO una llamada a la IA a propósito: en algo de
 * salud interesa que sea el mismo resultado siempre, revisable de un vistazo,
 * gratis y sin depender de que haya red o cuota. Lo que no esté aquí se usa
 * tal cual lo escribió el usuario, que sigue funcionando para casos simples
 * ("kiwi" contra un ingrediente llamado "kiwi").
 */
const GROUPS: { match: string[]; expand: string[] }[] = [
  {
    match: ['frutos secos', 'fruto seco', 'nueces', 'nuts'],
    expand: ['almendra', 'nuez', 'anacardo', 'avellana', 'pistacho', 'piñon', 'macadamia', 'pecana', 'castaña'],
  },
  { match: ['cacahuete', 'mani', 'cacahuetes'], expand: ['cacahuete', 'mani', 'crema de cacahuete'] },
  {
    match: ['lactosa', 'lacteos', 'lacteo', 'leche', 'productos lacteos'],
    expand: ['leche', 'queso', 'yogur', 'nata', 'mantequilla', 'cuajada', 'requeson', 'kefir', 'bechamel'],
  },
  {
    match: ['gluten', 'celiaco', 'celiaca', 'trigo'],
    expand: ['trigo', 'cebada', 'centeno', 'espelta', 'harina', 'pan', 'pasta', 'cuscus', 'semola', 'macarron', 'espagueti', 'pan rallado'],
  },
  {
    match: ['marisco', 'mariscos', 'crustaceos', 'crustaceo'],
    expand: ['gamba', 'langostino', 'cangrejo', 'langosta', 'cigala', 'nécora', 'bogavante', 'mejillon', 'almeja', 'berberecho', 'calamar', 'pulpo', 'sepia', 'vieira'],
  },
  { match: ['huevo', 'huevos', 'ovoproductos'], expand: ['huevo', 'clara de huevo', 'yema', 'mayonesa', 'merengue'] },
  {
    match: ['pescado', 'pescados'],
    expand: ['salmon', 'atun', 'merluza', 'bacalao', 'sardina', 'boqueron', 'anchoa', 'lubina', 'dorada', 'trucha', 'caballa', 'rape', 'panga'],
  },
  { match: ['soja', 'soya'], expand: ['soja', 'tofu', 'tempeh', 'edamame', 'miso', 'salsa de soja'] },
  { match: ['sesamo', 'ajonjoli'], expand: ['sesamo', 'tahini', 'ajonjoli'] },
  { match: ['apio'], expand: ['apio'] },
  { match: ['mostaza'], expand: ['mostaza'] },
  { match: ['sulfitos'], expand: ['vino', 'vinagre', 'fruta desecada'] },
  { match: ['altramuces', 'altramuz'], expand: ['altramuz', 'lupino'] },
  { match: ['moluscos', 'molusco'], expand: ['mejillon', 'almeja', 'berberecho', 'calamar', 'pulpo', 'sepia', 'vieira', 'caracol'] },
];

/**
 * Términos concretos a buscar en los ingredientes, a partir de lo que escribió
 * el usuario. Siempre incluye lo original: si alguien pone "nuez de macadamia",
 * eso se busca igual aunque no esté en ningún grupo.
 */
export function expandAllergens(terms: string[]): string[] {
  const out = new Set<string>();
  for (const raw of terms) {
    const t = normalizeText(raw).trim();
    if (!t) continue;
    out.add(t);
    for (const g of GROUPS) {
      if (g.match.some((m) => t === m || t.includes(m) || m.includes(t))) {
        g.expand.forEach((e) => out.add(normalizeText(e)));
      }
    }
  }
  return [...out];
}

/** Lo que se le enseña al usuario: qué ha añadido cada término suyo. */
export function explainExpansion(term: string): string[] {
  const t = normalizeText(term).trim();
  const g = GROUPS.find((g) => g.match.some((m) => t === m || t.includes(m) || m.includes(t)));
  return g ? g.expand : [];
}

/**
 * ¿Esta receta contiene algún término prohibido? Mira los ingredientes Y el
 * nombre: hay recetas cuyo alérgeno solo aparece en el título ("tarta de
 * almendras" cuya lista dice "harina de almendra").
 */
export function recipeHasAllergen(
  recipe: { name?: string; ingredients?: { name?: string }[] },
  expandedTerms: string[]
): string | null {
  if (expandedTerms.length === 0) return null;
  const haystack = [
    normalizeText(recipe.name ?? ''),
    ...(recipe.ingredients ?? []).map((i) => normalizeText(i?.name ?? '')),
  ];
  for (const term of expandedTerms) {
    if (!term) continue;
    if (haystack.some((h) => h.includes(term))) return term;
  }
  return null;
}
