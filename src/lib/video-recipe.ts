import { existingIngredientsInstruction, UNIT_RULE } from '@/ai/prompt-fragments';

/**
 * Extracción de una receta a partir de un VÍDEO, hablando con Gemini a pelo
 * (no vía Genkit, porque hace falta la File API para subir ficheros grandes).
 *
 * Vivía dentro de `/api/analyze-video/route.ts`, que es donde lo usa la web.
 * Se saca aquí porque `/api/ai/import-recipe` —el camino de la app nativa—
 * necesita lo mismo, y **un `route.ts` de Next no puede exportar nada que no
 * sea un handler HTTP**: el build falla al validar el módulo de ruta.
 */

const API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const MODEL = 'gemini-2.5-flash';

export const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    /**
     * Salida de emergencia. Sin esto el esquema OBLIGA a devolver una receta,
     * así que ante un vídeo que no va de cocina el modelo no puede hacer otra
     * cosa que inventársela — le pasó al usuario con un reel cualquiera.
     */
    esReceta: { type: 'boolean' },
    motivoNoReceta: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    instructions: { type: 'string' },
    servings: { type: 'number' },
    imageHint: { type: 'string' },
    calories: { type: 'number' },
    protein: { type: 'number' },
    carbs: { type: 'number' },
    fat: { type: 'number' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          calories: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
          fiber: { type: 'number' },
          corrected: { type: 'boolean' },
          note: { type: 'string' },
        },
        required: ['id', 'name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'corrected'],
      },
    },
  },
  required: ['name', 'description', 'instructions', 'ingredients', 'calories', 'protein', 'carbs', 'fat', 'servings'],
};

const PROMPT = (caption: string, existingIngredients?: string[]) => `Eres un chef nutricionista experto. Analiza el vídeo adjunto — escucha el audio (cantidades, nombres de ingredientes, pasos), lee cualquier texto en pantalla y observa los ingredientes y técnicas visibles.

${caption ? `Texto adicional del post:\n${caption}\n\n` : ''}${existingIngredientsInstruction(existingIngredients)}

INSTRUCCIONES:
0. ANTES DE NADA: decide si esto es cocina. Pon esReceta=false si el contenido
   no enseña ni describe cómo preparar un plato — un vídeo de humor, de viajes,
   de gimnasio, un baile, una noticia, alguien comiendo sin explicar la receta,
   o comida que solo sale de fondo. En ese caso rellena motivoNoReceta con una
   frase corta de qué es (ej: "es un vídeo de gimnasio") y DEJA EL RESTO VACÍO:
   no inventes ingredientes ni pasos. Solo pon esReceta=true si de verdad puedes
   sacar los ingredientes y la preparación. Ante la duda, false.
1. Prioriza lo que ves y oyes en el vídeo. Usa el texto solo como complemento.
2. Extrae TODOS los ingredientes mencionados o mostrados, con cantidades exactas si se indican.
3. Para cada ingrediente, estima sus valores nutricionales POR 100g/100ml.
4. Auto-revisa las estimaciones con las referencias de abajo. Si corriges algo → corrected=true y nota breve. Si todo está bien → corrected=false.
5. Los macros TOTALES = suma de (cantidad/100 × macros_por_100g) para cada ingrediente.

REFERENCIAS (por 100g):
- Aceites: 700–900 kcal | Frutos secos: 500–700 kcal
- Especias secas (pimienta, paprika, etc.): 200–380 kcal — 1–10g, NUNCA >20g en receta
- Sal: 0 kcal | Azúcar: 400 kcal | Miel: 300 kcal
- Carnes/pescado: 100–350 kcal | Huevo: ~150 kcal
- Lácteos (leche/yogur): 40–100 kcal | Queso: 200–400 kcal
- Legumbres crudas: 300–380 kcal; cocidas: 100–150 kcal
- Cereales/pasta/arroz crudos: 330–380 kcal; cocidos: 120–180 kcal
- Frutas: 30–80 kcal | Verduras: 15–50 kcal (patata: ~80 kcal)

Devuelve:
- esReceta (boolean) y, si es false, motivoNoReceta con una frase corta
- name, description (1-2 frases), instructions (pasos con \\n), servings, imageHint (2-3 palabras inglés)
- calories, protein, carbs, fat: totales de la receta completa
- ingredients: cada uno con id ("ing-1"...), name (español, siguiendo la REGLA DE NOMBRES DE
  INGREDIENTES de arriba), quantity (corregida, en gramos/ml),
  ${UNIT_RULE}
  calories/protein/carbs/fat/fiber (POR 100g), corrected (boolean), note (si corrected=true)`;

export async function callGemini(parts: object[], caption: string, existingIngredients?: string[]) {
  const res = await fetch(`${GEMINI_BASE}/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [...parts, { text: PROMPT(caption, existingIngredients) }] }],
      generation_config: {
        response_mime_type: 'application/json',
        response_schema: RECIPE_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini no devolvió contenido.');
  return JSON.parse(raw);
}

export function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/i.test(url);
}

/**
 * Analiza un vídeo que ya está publicado en una URL. YouTube lo entiende Gemini
 * de forma nativa; para el resto de CDNs se declara `video/mp4` y hay que
 * confiar en que la URL sea públicamente accesible (las de Instagram y TikTok
 * caducan, así que esto falla a menudo — el llamador debe tener respaldo).
 */
export async function analyzeVideoFromUrl(videoUrl: string, caption: string, existingIngredients?: string[]) {
  const fileData = isYouTube(videoUrl) ? { file_uri: videoUrl } : { mime_type: 'video/mp4', file_uri: videoUrl };
  return callGemini([{ file_data: fileData }], caption, existingIngredients);
}

/** Parsea el array opcional de nombres de ingredientes del catálogo. */
export function parseExistingIngredients(raw: unknown): string[] | undefined {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return undefined;
    const names = arr.filter((n): n is string => typeof n === 'string').slice(0, 500);
    return names.length > 0 ? names : undefined;
  } catch {
    return undefined;
  }
}
