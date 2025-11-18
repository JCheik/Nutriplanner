'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, IdTokenResult } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { UserClaims } from '@/lib/types';

interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  claims: UserClaims | null;
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

  useEffect(() => {
    if (!auth || !firestore) {
      setIsLoading(false);
      setError(new Error("Firebase Auth or Firestore service not provided."));
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setIsLoading(true);
        if (firebaseUser) {
          try {
            const idTokenResult: IdTokenResult = await firebaseUser.getIdTokenResult();
            
            // Temporary admin override for development
            const finalClaims: UserClaims = { ...idTokenResult.claims };
            if (firebaseUser.email === 'jonicheik@gmail.com') {
              finalClaims.admin = true;
            }

            setUser(firebaseUser);
            setClaims(finalClaims);

          } catch (e) {
            console.error("Error getting user claims:", e);
            setUser(firebaseUser); // Set user even if claims fail
            setClaims(null);
            setError(e as Error);
          }
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
    isLoading,
    error,
  }), [firebaseApp, firestore, auth, storage, user, claims, isLoading, error]);

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
    const { user, claims, isLoading, error } = useFirebase();
    return { user, claims, loading: isLoading, error };
}
