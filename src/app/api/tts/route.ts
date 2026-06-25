import { NextRequest, NextResponse } from 'next/server';

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
 */
export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return NextResponse.json({ error: body || res.statusText }, { status: res.status });
  }

  const { audioContent } = (await res.json()) as { audioContent: string };
  return NextResponse.json({ audioContent });
}
