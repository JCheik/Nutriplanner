import { NextResponse } from 'next/server';

import { consumeAiQuota } from '@/lib/ai-rate-limit';
import { getAiErrorMessage } from '@/lib/ai-error';
import { failImportJob, finishImportJob, startImportJob } from '@/lib/import-persist';
import { analyzeVideoBytes } from '@/lib/video-recipe';
import { verifyAuth } from '@/lib/verify-auth';

import { CORS_HEADERS, corsPreflight } from '../_shared';

export const OPTIONS = corsPreflight;

// Subir el vídeo, esperar a que Gemini lo procese y analizarlo. Con un reel de
// 30 s son ~20 s en total, pero un clip largo se acerca al minuto.
export const maxDuration = 120;

/**
 * Importar una receta **del vídeo en sí**, no de lo que ponga el texto.
 *
 * Es la única forma de traerse las recetas de Instagram y TikTok: ahí la receta
 * se cuenta hablando y se ve en pantalla, y el pie de foto suele ser marketing
 * —cuando no está directamente vacío—. A eso se suma que ninguna de las dos
 * plataformas sirve el contenido de un post a quien no tiene sesión iniciada, así
 * que del enlace no se puede sacar ni el texto ni la URL del vídeo.
 *
 * Lo que sí puede hacer la app es mandar **el fichero**: el usuario guarda o
 * graba el vídeo y lo comparte con Nutrilp. Aquí se recibe.
 *
 * Va por `multipart/form-data` y no por JSON a propósito: un vídeo de 20 MB en
 * base64 son ~27 MB de texto que habría que construir entero en memoria en el
 * móvil antes de enviarlo. Por eso este endpoint no usa `runAiEndpoint`, que
 * asume un cuerpo JSON; la verificación y la cuota se hacen igual, a mano.
 */
export async function POST(req: Request) {
  let uid: string;
  try {
    uid = await verifyAuth(req);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'No autorizado.' }, { status, headers: CORS_HEADERS });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'No pude leer el vídeo.' }, { status: 400, headers: CORS_HEADERS });
  }

  const file = form.get('video');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No llegó ningún vídeo.' }, { status: 400, headers: CORS_HEADERS });
  }

  const jobId = typeof form.get('jobId') === 'string' ? (form.get('jobId') as string) : undefined;
  const caption = typeof form.get('caption') === 'string' ? (form.get('caption') as string) : '';
  const existingIngredients = parseNames(form.get('existingIngredients'));

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const quota = await consumeAiQuota(token);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.message ?? 'Has alcanzado el límite de IA por hoy.' },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  if (jobId) await startImportJob(uid, jobId, 'Viendo el vídeo…');

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const recipe = await analyzeVideoBytes(bytes, file.type || 'video/mp4', caption, existingIngredients);

    if (recipe?.esReceta === false) {
      const motivo = recipe.motivoNoReceta?.trim();
      throw new AiUserError(
        `En ese vídeo no veo una receta${motivo ? `: ${motivo}` : ''}. ¿Seguro que es el vídeo correcto?`
      );
    }

    if (!jobId) return NextResponse.json({ result: { recipe, source: 'video' } }, { headers: CORS_HEADERS });

    const saved = await finishImportJob(uid, jobId, recipe);
    return NextResponse.json({ result: { recipe, source: 'video', saved } }, { headers: CORS_HEADERS });
  } catch (e) {
    const message =
      e instanceof AiUserError ? e.message : getAiErrorMessage(e, 'No se pudo sacar la receta de ese vídeo.');
    if (jobId) await failImportJob(uid, jobId, message);
    return NextResponse.json({ error: message }, { status: 400, headers: CORS_HEADERS });
  }
}

/** Error con un mensaje ya escrito para el usuario. */
class AiUserError extends Error {}

function parseNames(raw: FormDataEntryValue | null): string[] | undefined {
  if (typeof raw !== 'string') return undefined;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return undefined;
    const names = arr.filter((n): n is string => typeof n === 'string').slice(0, 500);
    return names.length > 0 ? names : undefined;
  } catch {
    return undefined;
  }
}
