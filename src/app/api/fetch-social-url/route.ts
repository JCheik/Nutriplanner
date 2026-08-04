import { NextRequest, NextResponse } from 'next/server';

import { consumeSocialFetchQuota } from '@/lib/ai-rate-limit';
import { fetchImageAsDataUrl, fetchSocialMetadata, SocialUrlError } from '@/lib/social-url';
import { verifyAuth } from '@/lib/verify-auth';

/**
 * Lee una publicación de redes y devuelve sus metadatos al importador de la
 * WEB. La lógica (y sus protecciones anti-SSRF) vive en `lib/social-url.ts`,
 * compartida con `/api/ai/import-recipe`, que es el camino de la app nativa.
 */
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyAuth(req);

    // Con auth pero sin tope, esto era un proxy web para cualquiera que se
    // registrara. Se cuenta ANTES de salir a la red, para que el límite valga
    // aunque la página tarde o falle.
    const quota = await consumeSocialFetchQuota(uid);
    if (!quota.allowed) {
      return NextResponse.json({ success: false, error: quota.message }, { status: 429 });
    }

    const { url } = (await req.json()) as { url: string };
    const meta = await fetchSocialMetadata(url);

    // La foto se descarga aquí (sin CORS) para que el cliente pueda re-alojarla.
    const imageDataUrl = meta.imageUrl ? await fetchImageAsDataUrl(meta.imageUrl) : null;

    return NextResponse.json({ success: true, ...meta, imageDataUrl });
  } catch (err: unknown) {
    if (err instanceof SocialUrlError) {
      // Los errores de dominio/protocolo se devolvían con su código; el resto,
      // como 200 con success:false (contrato que ya esperaba el diálogo web).
      const status = err.status === 400 || err.status === 403 ? err.status : 200;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    const status = (err as { status?: number }).status;
    if (status === 401) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : 'Error al acceder a la URL';
    return NextResponse.json({ success: false, error: msg });
  }
}
