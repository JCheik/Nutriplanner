'use client';

import { firebaseConfig as devFirebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {type DependencyList, useMemo} from "react";

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase(firebaseConfig: FirebaseOptions) {
  if (getApps().length === 0) {
    // @ts-ignore
    if (typeof __FIREBASE_DEFAULTS__ !== 'undefined') {
        // @ts-ignore
        return getSdks(initializeApp(__FIREBASE_DEFAULTS__));
    }
    
    // Fallback for local development
    return getSdks(initializeApp(firebaseConfig));
  }
  
  // If already initialized, return the SDKs with the existing App
  return getSdks(getApp());
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
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
