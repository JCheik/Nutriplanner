'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {type DependencyList, useMemo} from "react";

// This function is intended for client-side use ONLY.
export function initializeFirebase(config: FirebaseOptions) {
  // On the client, we want to ensure we are reusing the same app instance.
  if (getApps().length > 0) {
    return getSdks(getApp());
  }
  // If no app is initialized, initialize one with the provided config.
  return getSdks(initializeApp(config));
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);

  if (typeof memoized !== 'object' || memoized === null) return memoized;

  // Add a non-enumerable property to mark the object as memoized.
  // This helps our hooks detect if a reference is not stable.
  Object.defineProperty(memoized, '__memo', {
    value: true,
    enumerable: false,
    configurable: true,
  });
  
  return memoized;
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';

export * from './errors';
export * from './error-emitter';
