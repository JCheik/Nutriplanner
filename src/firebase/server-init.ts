/**
 * @fileoverview Server-side Firebase initialization.
 * This file is NOT for client-side use and should only be imported in Server Actions or API routes.
 */
import { initializeApp, getApps, cert, type AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from './config';

// The service account key is securely stored as an environment variable.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

// Use the client-side config for project details and add credentials for admin access.
const adminConfig: AppOptions = {
  ...firebaseConfig,
  credential: serviceAccount ? cert(serviceAccount) : undefined,
};

/**
 * Initializes and returns the Firebase Admin SDK services.
 * Ensures that the app is initialized only once (singleton pattern).
 */
export function initializeFirebase() {
  if (!getApps().length) {
    initializeApp(adminConfig);
  }
  return {
    firestore: getFirestore(),
    storage: getStorage(),
    auth: getAuth(),
  };
}
