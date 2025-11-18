'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, writeBatch, collection } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getRedirectResult, IdTokenResult } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { UserClaims, UserProfile } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
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
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
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
    
    // First, handle the redirect result from Google Sign-In
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const user = result.user;
          const userRef = doc(firestore, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
             // Create user profile and initial data if they are new
            const batch = writeBatch(firestore);
            
            const profile: UserProfile = {
              name: user.displayName || 'Nuevo Usuario',
              email: user.email || '',
              photoURL: user.photoURL || '',
              stickyNote: '¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.',
            }
            batch.set(userRef, profile, { merge: true });

            const recipesCollectionRef = collection(firestore, 'users', user.uid, 'recipes');
            INITIAL_RECIPES.forEach(recipe => {
              const recipeRef = doc(recipesCollectionRef);
              batch.set(recipeRef, { ...recipe, id: recipeRef.id });
            });

            const weekPlanCollectionRef = collection(firestore, 'users', user.uid, 'weekPlan');
            INITIAL_WEEK_PLAN.forEach(dayPlan => {
              const dayRef = doc(weekPlanCollectionRef, dayPlan.day);
              batch.set(dayRef, dayPlan);
            });

            await batch.commit().catch(err => {
              console.error("Error creating initial user data:", err);
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: `/users/${user.uid}`,
                  operation: 'write',
                  requestResourceData: { note: 'Initial user setup batch write.' }
              }));
            });
          }
        }
      })
      .catch(err => {
        if (err.code !== 'auth/user-cancelled' && err.code !== 'auth/account-exists-with-different-credential') {
          console.error('Error handling redirect result: ', err);
          setError(err);
        }
      });
      

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult();
            setUser(firebaseUser);
            setClaims(idTokenResult.claims as UserClaims);
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
    user,
    claims,
    isLoading,
    error,
  }), [firebaseApp, firestore, auth, user, claims, isLoading, error]);

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

