'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider, type FirebaseContextState } from '@/firebase/provider';
import { initializeFirebase, getSdks } from '@/firebase';
import { firebaseConfig } from './config';
import { FirebaseApp } from 'firebase/app';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase(firebaseConfig);
  }, []); // Empty dependency array ensures this runs only once on mount

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
