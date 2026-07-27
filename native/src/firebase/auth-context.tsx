import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { auth } from '@/firebase';

interface AuthState {
  user: User | null;
  /** True until the first auth snapshot arrives (persisted session restore). */
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setState({ user, loading: false }));
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthUser() {
  return useContext(AuthContext);
}

export function logOut() {
  return signOut(auth);
}
