'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, IdTokenResult } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { UserClaims } from '@/lib/types';
import { SUPERUSER_EMAIL } from '@/lib/constants';
import { getSdks } from '.';

export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  claims: UserClaims | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<UserClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isAdmin = useMemo(() => claims?.admin === true || user?.email === SUPERUSER_EMAIL, [claims, user]);

  useEffect(() => {
    if (!auth || !firestore) {
      setIsLoading(false);
      setError(new Error("Firebase Auth or Firestore service not provided."));
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // Resolve auth as soon as the state is known. We deliberately do NOT
        // await getIdTokenResult() here: on a flaky mobile network that call
        // can hang on token refresh, which would leave the app stuck on the
        // loader. Set the user synchronously, clear loading, then fetch claims
        // in the background. We also never flip isLoading back to true after the
        // first resolution, so token refreshes don't unmount the authed tree.
        if (firebaseUser) {
          setUser(firebaseUser);
          setError(null);
          firebaseUser
            .getIdTokenResult()
            .then((idTokenResult: IdTokenResult) => {
              setClaims({ ...idTokenResult.claims } as UserClaims);
            })
            .catch((e) => {
              console.error('Error getting user claims:', e);
              setClaims(null);
            });
        } else {
          setUser(null);
          setClaims(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("onAuthStateChanged error:", err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo(() => ({
    firebaseApp,
    firestore,
    auth,
    storage,
    user,
    claims,
    isAdmin,
    isLoading,
    error,
  }), [firebaseApp, firestore, auth, storage, user, claims, isAdmin, isLoading, error]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = (): Auth | null => useFirebase().auth;
export const useFirestore = (): Firestore | null => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp | null => useFirebase().firebaseApp;
export const useUser = () => {
    const { user, claims, isAdmin, isLoading, error } = useFirebase();
    return { user, claims, isAdmin, loading: isLoading, error };
}
