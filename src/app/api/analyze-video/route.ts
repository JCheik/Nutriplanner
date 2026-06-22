import { NextRequest, NextResponse } from 'next/server';

// Allow up to 2 minutes for video upload + Gemini processing
export const maxDuration = 120;

const API_KEY = process.env.GEMINI_API_KEY!;
const UPLOAD_BASE = 'https://generativelanguage.googleapis.com';

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

async function uploadToFileApi(buffer: Buffer, mimeType: string): Promise<{ name: string; uri: string; mimeType: string }> {
  // 1. Start resumable upload session
  const initRes = await fetch(`${UPLOAD_BASE}/upload/v1beta/files?key=${API_KEY}`, {
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

  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`File API init failed (${initRes.status}): ${text}`);
  }

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('No X-Goog-Upload-URL header in response');

  // 2. Upload file bytes in one shot
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(buffer.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`File upload failed (${uploadRes.status}): ${text}`);
  }

  const data = await uploadRes.json();
  return data.file as { name: string; uri: string; mimeType: string };
}

async function waitForFileActive(fileName: string, maxWaitMs = 90000): Promise<{ uri: string; mimeType: string }> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${UPLOAD_BASE}/v1beta/${fileName}?key=${API_KEY}`);
    const file = await res.json();
    if (file.state === 'ACTIVE') return file as { uri: string; mimeType: string };
    if (file.state === 'FAILED') throw new Error('El vídeo no se pudo procesar. Prueba con otro formato.');
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Timeout: el vídeo tardó demasiado en procesarse.');
}

async function deleteFile(fileName: string) {
  try {
    await fetch(`${UPLOAD_BASE}/v1beta/${fileName}?key=${API_KEY}`, { method: 'DELETE' });
  } catch {
    // Ignore cleanup errors
  }
}

export async function POST(req: NextRequest) {
  let fileName: string | undefined;

  try {
    const formData = await req.formData();
    const videoFile = formData.get('video') as File | null;
    const caption = (formData.get('caption') as string) || '';

    if (!videoFile) {
      return NextResponse.json({ success: false, error: 'No se recibió ningún vídeo.' }, { status: 400 });
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (videoFile.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'El vídeo supera los 100MB. Usa un vídeo más corto.' }, { status: 400 });
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const mimeType = videoFile.type || 'video/mp4';

    // Upload to Google File API
    const uploadedFile = await uploadToFileApi(buffer, mimeType);
    fileName = uploadedFile.name;

    // Wait until Gemini can access it
    const activeFile = await waitForFileActive(uploadedFile.name);

    const contextText = caption
      ? `Texto adicional del post:\n${caption}\n\n`
      : '';

    const prompt = `Eres un chef nutricionista experto. Analiza el vídeo adjunto (escucha el audio, lee cualquier texto en pantalla y observa los ingredientes y técnicas) y extrae la receta completa.

${contextText}REGLAS:
1. Prioriza la información del vídeo sobre el texto adicional.
2. Extrae TODOS los ingredientes que aparezcan en el vídeo, con cantidades exactas si se mencionan.
3. Si las cantidades no se dicen claramente, usa estimaciones razonables para ese plato.
4. Para los macros, calcula el total de la receta completa (no por ración).
5. Nombres de ingredientes en español, simples y sin cantidad (ej: "pechuga de pollo", "arroz blanco").

Devuelve:
- name: nombre de la receta
- description: descripción corta y apetecible (1-2 frases)
- instructions: pasos numerados separados por \\n
- ingredients: array. Cada uno: id ("ing-1","ing-2"...), name, quantity (número), unit (g/ml/ud/taza/cucharada...)
- calories: kcal totales de toda la receta
- protein, carbs, fat: gramos totales
- servings: número de raciones
- imageHint: 2-3 palabras en inglés para búsqueda de imagen`;

    const geminiRes = await fetch(
      `${UPLOAD_BASE}/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { file_data: { mime_type: activeFile.mimeType, file_uri: activeFile.uri } },
                { text: prompt },
              ],
            },
          ],
          generation_config: {
            response_mime_type: 'application/json',
            response_schema: RECIPE_SCHEMA,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini error (${geminiRes.status}): ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini no devolvió contenido.');

    const recipe = JSON.parse(rawText);

    return NextResponse.json({ success: true, recipe });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al analizar el vídeo.';
    console.error('analyze-video error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    // Clean up the uploaded file from Google's servers
    if (fileName) await deleteFile(fileName);
  }
}
