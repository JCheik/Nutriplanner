import { NextRequest, NextResponse } from 'next/server';

import { analyzeVideoFromUrl, callGemini, parseExistingIngredients } from '@/lib/video-recipe';
import { verifyAuth } from '@/lib/verify-auth';

/**
 * Extrae una receta de un vídeo, para el importador de la WEB.
 *
 * El prompt, el esquema y la llamada a Gemini viven en `lib/video-recipe.ts`,
 * compartidos con `/api/ai/import-recipe` (el camino de la app). Aquí se queda
 * solo lo propio de esta ruta: la subida por File API, que es lo que permite
 * mandar un fichero de vídeo del disco del usuario.
 */
export const maxDuration = 120;

const API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

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
  } catch {
    /* ignore */
  }
}

// ── ROUTE HANDLER ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  let fileName: string | undefined;

  try {
    await verifyAuth(req);

    // ── Mode A: URL-based (JSON body) ─────────────────────────────────────
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as { videoUrl: string; caption?: string; existingIngredients?: unknown };
      const { videoUrl, caption = '' } = body;

      if (!videoUrl) {
        return NextResponse.json({ success: false, error: 'videoUrl requerida' }, { status: 400 });
      }

      const recipe = await analyzeVideoFromUrl(videoUrl, caption, parseExistingIngredients(body.existingIngredients));
      return NextResponse.json({ success: true, recipe, source: 'url' });
    }

    // ── Mode B: File upload (multipart/form-data) ─────────────────────────
    const formData = await req.formData();
    const videoFile = formData.get('video') as File | null;
    const caption = (formData.get('caption') as string) || '';
    const existingIngredients = parseExistingIngredients(formData.get('existingIngredients'));

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
      caption,
      existingIngredients
    );

    return NextResponse.json({ success: true, recipe, source: 'upload' });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 401) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : 'Error al analizar el vídeo.';
    console.error('analyze-video error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    if (fileName) await deleteFile(fileName);
  }
}
