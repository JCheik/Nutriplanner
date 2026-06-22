import { initializeFirebase } from '@/firebase/server-init';

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
