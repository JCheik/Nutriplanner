import { NextRequest, NextResponse } from 'next/server';

import { verifyAuth } from '@/lib/verify-auth';

/**
 * Proxy to Google Cloud Text-to-Speech API.
 *
 * Uses the same GEMINI_API_KEY — you just need to enable the
 * "Cloud Text-to-Speech API" for that key in Google Cloud Console:
 *   https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
 *
 * Returns { audioContent: string } — base64-encoded MP3.
 * Returns 503 if the key is not set or the API is not enabled; the caller
 * falls back to browser TTS in that case.
 *
 * ⚠️ REQUIERE SESIÓN. Esto es un proxy a una API **de pago** con nuestra clave:
 * abierto, cualquiera que supiera la URL podía sintetizar voz a nuestra costa
 * (auditoría 2026-07-29). No lleva cuota propia porque el gasto por llamada es
 * pequeño y el tope duro es el presupuesto de Cloud, pero exigir token deja el
 * abuso al alcance solo de usuarios registrados y identificables.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 503 });
  }

  let text: string;
  try {
    ({ text } = (await req.json()) as { text: string });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text.slice(0, 5000) },
          voice: {
            languageCode: 'es-ES',
            // Neural2 = highest quality (natural-sounding). Free tier: 500k chars/month.
            name: 'es-ES-Neural2-A',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
            effectsProfileId: ['headphone-class-device'],
          },
        }),
      }
    );
  } catch (err) {
    console.error('[api/tts] upstream request failed:', err);
    return NextResponse.json({ error: 'No se pudo generar el audio.' }, { status: 502 });
  }

  if (!res.ok) {
    // El cuerpo de Google puede traer detalles de la clave o del proyecto: se
    // registra en el servidor y al cliente le va un mensaje neutro.
    const body = await res.text().catch(() => '');
    console.error(`[api/tts] upstream ${res.status}:`, body);
    return NextResponse.json({ error: 'No se pudo generar el audio.' }, { status: res.status });
  }

  const { audioContent } = (await res.json()) as { audioContent: string };
  return NextResponse.json({ audioContent });
}
