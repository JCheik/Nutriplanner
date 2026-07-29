import { NextResponse } from 'next/server';

import { consumeAiQuota } from '@/lib/ai-rate-limit';
import { getAiErrorMessage } from '@/lib/ai-error';
import { verifyAuth } from '@/lib/verify-auth';

/**
 * Shared plumbing for the authenticated AI endpoints the NATIVE app calls
 * (the web keeps calling the Genkit flows directly as Server Actions). Each
 * endpoint: verifies the Firebase ID token → applies the same per-user daily
 * quota as the web → runs the flow → returns JSON. The Gemini key never leaves
 * the server. CORS is permissive so Expo web (localhost:8081) can test too;
 * native fetch isn't subject to CORS anyway.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Error con un mensaje ya escrito para el usuario. `runAiEndpoint` lo devuelve
 * literal, en vez de pasarlo por el traductor de errores del modelo.
 */
export class AiEndpointError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

function bearerToken(req: Request): string {
  const h = req.headers.get('authorization') ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

/**
 * Runs an AI flow behind auth + quota. `run` receives the parsed body and the
 * caller's uid and returns whatever JSON payload to send back on success.
 */
export async function runAiEndpoint<TBody>(
  req: Request,
  run: (body: TBody, uid: string) => Promise<unknown>,
  fallbackError: string
): Promise<NextResponse> {
  let uid: string;
  try {
    uid = await verifyAuth(req);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'No autorizado.' }, { status, headers: CORS_HEADERS });
  }

  let body: TBody;
  try {
    body = (await req.json()) as TBody;
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400, headers: CORS_HEADERS });
  }

  const quota = await consumeAiQuota(bearerToken(req));
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.message ?? 'Has alcanzado el límite de IA por hoy.' },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  try {
    const result = await run(body, uid);
    return NextResponse.json({ result }, { headers: CORS_HEADERS });
  } catch (e) {
    // Un error nuestro con mensaje pensado para el usuario pasa tal cual. Sin
    // esto lo tragaría `getAiErrorMessage`, que solo entiende errores del
    // modelo — y peor: un mensaje que contenga "403" (p. ej. "dominio no
    // permitido") acabaría diciendo que la IA está mal configurada.
    if (e instanceof AiEndpointError) {
      return NextResponse.json({ error: e.message }, { status: e.status, headers: CORS_HEADERS });
    }
    console.error('[api/ai] flow failed:', e);
    return NextResponse.json(
      { error: getAiErrorMessage(e, fallbackError) },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
