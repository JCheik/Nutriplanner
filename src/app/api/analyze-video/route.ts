import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

const API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const MODEL = 'gemini-2.5-flash';

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    instructions: { type: 'string' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
        },
        required: ['id', 'name', 'quantity', 'unit'],
      },
    },
    calories: { type: 'number' },
    protein: { type: 'number' },
    carbs: { type: 'number' },
    fat: { type: 'number' },
    servings: { type: 'number' },
    imageHint: { type: 'string' },
  },
  required: ['name', 'description', 'instructions', 'ingredients', 'calories', 'protein', 'carbs', 'fat', 'servings'],
};

const PROMPT = (caption: string) => `Eres un chef nutricionista experto. Analiza el vídeo adjunto — escucha el audio (cantidades, nombres de ingredientes, pasos), lee cualquier texto en pantalla y observa los ingredientes y técnicas visibles.

${caption ? `Texto adicional del post:\n${caption}\n\n` : ''}REGLAS:
1. Prioriza lo que ves y oyes en el vídeo. Usa el texto solo como complemento.
2. Extrae TODOS los ingredientes mencionados o mostrados, con cantidades exactas si se indican.
3. Si no se especifican cantidades, usa estimaciones razonables para ese plato.
4. Los macros deben ser del total de la receta completa (no por ración).
5. Nombres de ingredientes en español, simples (ej: "pechuga de pollo", "arroz blanco").

Devuelve:
- name: nombre de la receta
- description: descripción corta y apetecible (1-2 frases)
- instructions: pasos numerados separados por \\n
- ingredients: array. Cada uno: id ("ing-1","ing-2"...), name, quantity (número), unit (g/ml/ud/taza/cucharada...)
- calories: kcal totales de toda la receta
- protein, carbs, fat: gramos totales
- servings: número de raciones que produce
- imageHint: 2-3 palabras en inglés para búsqueda de imagen`;

async function callGemini(parts: object[], caption: string) {
  const res = await fetch(
    `${GEMINI_BASE}/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [...parts, { text: PROMPT(caption) }] }],
        generation_config: {
          response_mime_type: 'application/json',
          response_schema: RECIPE_SCHEMA,
          temperature: 0.2,
        },
      }),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini no devolvió contenido.');
  return JSON.parse(raw);
}

// ── URL-BASED ANALYSIS ────────────────────────────────────────────────────────

function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/i.test(url);
}

async function analyzeFromUrl(videoUrl: string, caption: string) {
  // YouTube: no mime_type needed — Gemini handles it natively.
  // Other CDN URLs: declare video/mp4 and hope the URL is publicly accessible.
  const fileData = isYouTube(videoUrl)
    ? { file_uri: videoUrl }
    : { mime_type: 'video/mp4', file_uri: videoUrl };

  return callGemini([{ file_data: fileData }], caption);
}

// ── FILE-BASED ANALYSIS (Google File API) ────────────────────────────────────

async function uploadToFileApi(buffer: Buffer, mimeType: string) {
  const initRes = await fetch(`${GEMINI_BASE}/upload/v1beta/files?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(buffer.length),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: 'recipe_video' } }),
  });

  if (!initRes.ok) throw new Error(`File API init failed (${initRes.status})`);

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('No upload URL returned by File API');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(buffer.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: buffer,
  });

  if (!uploadRes.ok) throw new Error(`File upload failed (${uploadRes.status})`);
  const data = await uploadRes.json();
  return data.file as { name: string; uri: string; mimeType: string };
}

async function waitForFileActive(fileName: string, maxWaitMs = 90000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${GEMINI_BASE}/v1beta/${fileName}?key=${API_KEY}`);
    const file = await res.json();
    if (file.state === 'ACTIVE') return file as { uri: string; mimeType: string };
    if (file.state === 'FAILED') throw new Error('El vídeo no se pudo procesar. Prueba con otro formato.');
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Timeout: el vídeo tardó demasiado en procesarse.');
}

async function deleteFile(name: string) {
  try {
    await fetch(`${GEMINI_BASE}/v1beta/${name}?key=${API_KEY}`, { method: 'DELETE' });
  } catch { /* ignore */ }
}

// ── ROUTE HANDLER ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  let fileName: string | undefined;

  try {
    // ── Mode A: URL-based (JSON body) ─────────────────────────────────────
    if (contentType.includes('application/json')) {
      const { videoUrl, caption = '' } = await req.json() as { videoUrl: string; caption?: string };

      if (!videoUrl) {
        return NextResponse.json({ success: false, error: 'videoUrl requerida' }, { status: 400 });
      }

      const recipe = await analyzeFromUrl(videoUrl, caption);
      return NextResponse.json({ success: true, recipe, source: 'url' });
    }

    // ── Mode B: File upload (multipart/form-data) ─────────────────────────
    const formData = await req.formData();
    const videoFile = formData.get('video') as File | null;
    const caption = (formData.get('caption') as string) || '';

    if (!videoFile) {
      return NextResponse.json({ success: false, error: 'No se recibió ningún vídeo.' }, { status: 400 });
    }

    if (videoFile.size > 100 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'El vídeo supera los 100 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const mimeType = videoFile.type || 'video/mp4';

    const uploaded = await uploadToFileApi(buffer, mimeType);
    fileName = uploaded.name;

    const active = await waitForFileActive(uploaded.name);
    const recipe = await callGemini(
      [{ file_data: { mime_type: active.mimeType, file_uri: active.uri } }],
      caption
    );

    return NextResponse.json({ success: true, recipe, source: 'upload' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al analizar el vídeo.';
    console.error('analyze-video error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    if (fileName) await deleteFile(fileName);
  }
}
