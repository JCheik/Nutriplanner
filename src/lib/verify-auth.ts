import { initializeFirebase } from '@/firebase/server-init';
import { SUPERUSER_EMAIL } from '@/lib/constants';

export async function verifyAuth(req: Request): Promise<string> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    throw Object.assign(new Error('No autorizado'), { status: 401 });
  }

  const { auth } = initializeFirebase();
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw Object.assign(new Error('Token inválido'), { status: 401 });
  }
}

/**
 * Verifies an ID token (passed from the client) and asserts the caller is an
 * admin. Use this to guard privileged Server Actions, which the Admin SDK runs
 * with full privileges that bypass Firestore security rules — a client-side
 * route guard is NOT sufficient protection on its own.
 *
 * @returns the verified admin's uid
 * @throws { status: 401 } if the token is missing/invalid
 * @throws { status: 403 } if the caller is authenticated but not an admin
 */
export async function verifyAdmin(idToken: string | undefined): Promise<string> {
  if (!idToken) {
    throw Object.assign(new Error('No autorizado'), { status: 401 });
  }

  const { auth } = initializeFirebase();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    throw Object.assign(new Error('Token inválido'), { status: 401 });
  }

  const isAdmin = decoded.admin === true || decoded.email === SUPERUSER_EMAIL;
  if (!isAdmin) {
    throw Object.assign(new Error('Acceso denegado: se requieren permisos de administrador.'), { status: 403 });
  }

  return decoded.uid;
}
