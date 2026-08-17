import { existingIngredientsInstruction, UNIT_RULE } from '@/ai/prompt-fragments';
import { fetchVideoBytes } from '@/lib/social-url';

/**
 * Extracción de una receta a partir de un VÍDEO, hablando con Gemini a pelo
 * (no vía Genkit, porque hace falta la Files API para subir el fichero).
 *
 * Vivía dentro de `/api/analyze-video/route.ts`, que es donde lo usa la web.
 * Se saca aquí porque `/api/ai/import-recipe` —el camino de la app nativa—
 * necesita lo mismo, y **un `route.ts` de Next no puede exportar nada que no
 * sea un handler HTTP**: el build falla al validar el módulo de ruta.
 */

const API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

/**
 * Mismo modelo que `GEMINI_MODEL` de `@/ai/genkit`, pero escrito a mano: aquí se
 * habla con la REST API a pelo, que no entiende el prefijo `googleai/`, e
 * importar el módulo de Genkit solo por leer una constante arrastraría todo su
 * runtime a esta ruta.
 *
 * ⚠️ **Mantener en sincronía con `GEMINI_MODEL`.** La migración del 2026-08-09
 * que sacó los flujos de `gemini-2.5-flash` se dejó este fichero atrás — y es el
 * camino del vídeo, el más caro y el más visible. Google retira los 2.5 el
 * **16 de octubre de 2026**, así que importar recetas de un vídeo habría dejado
 * de funcionar en plena alfa.
 */
const MODEL = 'gemini-3.5-flash';

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
0. ANTES DE NADA: decide si aquí hay una receta que extraer.
   · esReceta=false SOLO si el contenido no va de cocinar — humor, viajes,
     gimnasio, un baile, una noticia, o comida que solo sale de fondo. Rellena
     motivoNoReceta con una frase corta de qué es (ej: "es un vídeo de gimnasio")
     y DEJA EL RESTO VACÍO.
   · Si se ve o se nombra un plato y puedes deducir sus ingredientes, ES RECETA
     — aunque no se expliquen los pasos. Escribe tú unos pasos razonables.
   · Ante la duda entre extraerla o rechazarla, EXTRÁELA: una receta floja el
     usuario la corrige; la que rechazas, la pierde.
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
 * Sube un vídeo a la Files API de Gemini y espera a que esté listo para usarse.
 *
 * Subida reanudable en dos pasos, que es la que documenta Google: primero se
 * anuncia el tamaño y el tipo y se recibe una URL, y luego se mandan los bytes.
 * Después hay que ESPERAR: un vídeo entra en `PROCESSING` y no se puede
 * referenciar hasta que pasa a `ACTIVE`.
 */
async function uploadVideo(bytes: Buffer, mimeType: string): Promise<{ uri: string; name: string }> {
  const start = await fetch(`${GEMINI_BASE}/upload/v1beta/files?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: 'nutrilp-import' } }),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error(`Files API no dio URL de subida (${start.status})`);

  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Length': String(bytes.length),
    },
    body: new Uint8Array(bytes),
  });
  if (!up.ok) throw new Error(`Files API rechazó la subida (${up.status})`);
  const file = (await up.json()).file as { uri: string; name: string; state: string };

  // Espera acotada: un reel tarda un par de segundos. Si a los 30 sigue sin
  // estar, se abandona y el llamador tira del pie de foto.
  let state = file.state;
  for (let i = 0; state === 'PROCESSING' && i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${GEMINI_BASE}/v1beta/${file.name}?key=${API_KEY}`);
    state = ((await res.json()) as { state: string }).state;
  }
  if (state !== 'ACTIVE') throw new Error(`El vídeo no llegó a estar listo (${state})`);

  return { uri: file.uri, name: file.name };
}

/** Borra el vídeo del servidor de Gemini. Best-effort: si falla, caduca solo. */
async function deleteUploaded(name: string): Promise<void> {
  try {
    await fetch(`${GEMINI_BASE}/v1beta/${name}?key=${API_KEY}`, { method: 'DELETE' });
  } catch {
    /* los ficheros de la Files API caducan a las 48 h por su cuenta */
  }
}

/**
 * Analiza el vídeo de una publicación.
 *
 * **YouTube** lo entiende Gemini a partir de la URL, sin más. **Todo lo demás
 * hay que subirlo**: a una URL de vídeo cualquiera responde `400 Unsupported
 * url`. Antes se le pasaba el enlace del CDN tal cual, así que en Instagram y
 * TikTok el análisis fallaba SIEMPRE y la importación caía al pie de foto sin
 * decir nada — de ahí que las recetas que solo se cuentan hablando en el vídeo
 * no se importaran nunca.
 */
export async function analyzeVideoFromUrl(videoUrl: string, caption: string, existingIngredients?: string[]) {
  if (isYouTube(videoUrl)) {
    return callGemini([{ file_data: { file_uri: videoUrl } }], caption, existingIngredients);
  }

  const descargado = await fetchVideoBytes(videoUrl);
  if (!descargado) throw new Error('No se pudo descargar el vídeo de la publicación.');

  return analyzeVideoBytes(descargado.bytes, descargado.contentType, caption, existingIngredients);
}

/**
 * Analiza un vídeo del que ya tenemos los BYTES.
 *
 * Es el camino de Instagram y TikTok: como no se puede llegar al vídeo desde el
 * enlace, lo manda la app —el usuario guarda o graba el reel y lo comparte— y
 * aquí se sube a la Files API y se analiza. El fichero se borra siempre, haya
 * ido bien o mal; si el borrado fallara, la Files API los caduca a las 48 h.
 */
export async function analyzeVideoBytes(
  bytes: Buffer,
  mimeType: string,
  caption: string,
  existingIngredients?: string[]
) {
  const subido = await uploadVideo(bytes, mimeType);
  try {
    return await callGemini(
      [{ file_data: { mime_type: mimeType, file_uri: subido.uri } }],
      caption,
      existingIngredients
    );
  } finally {
    void deleteUploaded(subido.name);
  }
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
