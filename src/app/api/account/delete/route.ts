import { NextResponse } from 'next/server';

import { deleteAccountCompletely } from '@/lib/delete-account';
import { verifyAuth } from '@/lib/verify-auth';

/**
 * Borrado de la PROPIA cuenta. Requisito de Google Play y App Store: si te
 * puedes registrar desde la app, tienes que poder borrarte desde la app.
 *
 * Solo acepta el uid que sale del token verificado — **no hay parámetro de
 * usuario**, así que nadie puede pedir el borrado de otra cuenta por aquí. Para
 * borrar a terceros está la Server Action de admin, con su `verifyAdmin`.
 *
 * CORS abierto como en `/api/ai/*`: la app nativa no pasa por CORS, pero Expo
 * web (localhost:8081) sí, y así se puede probar.
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let uid: string;
  try {
    uid = await verifyAuth(req);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'No autorizado.' }, { status, headers: CORS_HEADERS });
  }

  try {
    await deleteAccountCompletely(uid);
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Account self-deletion failed:', error);
    return NextResponse.json(
      { error: 'No se pudo borrar la cuenta. Inténtalo de nuevo o escríbenos.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
