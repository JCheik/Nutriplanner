import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { auth } from '@/firebase';
import { signOutGoogle } from '@/firebase/auth-operations';
import { clearOfflineCache } from '@/lib/offline-cache';

interface AuthState {
  user: User | null;
  /** True until the first auth snapshot arrives (persisted session restore). */
  loading: boolean;
  /**
   * Si esta cuenta administra el recetario de Nutrilp. Sale del claim `admin`
   * del token, con el correo del superusuario como respaldo — los MISMOS dos
   * criterios que `isAdmin()` en firestore.rules, que es quien manda de verdad:
   * esto solo decide si se enseñan los botones.
   */
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, isAdmin: false });

/** Espejo de `isAdmin()` en firestore.rules. Si cambia allí, cambiar aquí. */
const SUPERUSER_EMAIL = 'jonicheik@gmail.com';

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, isAdmin: false });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, loading: false, isAdmin: false });
        return;
      }
      let isAdmin = user.email === SUPERUSER_EMAIL;
      try {
        const token = await user.getIdTokenResult();
        isAdmin = isAdmin || token.claims.admin === true;
      } catch {
        // Sin token legible se sigue con lo que diga el correo: como mucho se
        // enseña un botón que las rules van a rechazar igualmente.
      }
      setState({ user, loading: false, isAdmin });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthUser() {
  return useContext(AuthContext);
}

export async function logOut() {
  // Primero Google: si no, la próxima vez entraría solo con la cuenta anterior
  // sin dar a elegir.
  await signOutGoogle();
  // Y la caché offline: el plan de nadie debe quedarse en el disco del móvil
  // después de cerrar sesión.
  await clearOfflineCache();
  return signOut(auth);
}
