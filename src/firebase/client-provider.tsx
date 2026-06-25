'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { firebaseConfig, getMissingFirebaseConfigVars } from './config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/** Actionable screen shown when Firebase env vars are missing (mainly local dev). */
function MissingConfigScreen({ missing }: { missing: string[] }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <h1 className="text-lg font-semibold text-destructive">Configuración de Firebase incompleta</h1>
        <p className="text-sm text-muted-foreground">
          Faltan estas variables de entorno. Añádelas a tu archivo{' '}
          <code className="rounded bg-muted px-1 py-0.5">.env.local</code> y reinicia el servidor:
        </p>
        <ul className="space-y-1 font-mono text-xs text-foreground">
          {missing.map((v) => (
            <li key={v} className="rounded bg-muted px-2 py-1">{v}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Fail fast with a clear message if required env vars are absent, instead of
  // letting the Firebase SDK throw a cryptic `auth/invalid-api-key` later.
  const missing = getMissingFirebaseConfigVars();

  // Memoize the Firebase services initialization.
  // This ensures Firebase is initialized only once per client session.
  const firebaseServices = useMemo(() => {
    if (missing.length > 0) return null;
    // Pass the explicit config to the initialization function.
    return initializeFirebase(firebaseConfig);
  }, [missing.length]);

  if (!firebaseServices) {
    return <MissingConfigScreen missing={missing} />;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
