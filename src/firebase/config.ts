import { FirebaseOptions } from 'firebase/app';

// This configuration is used for BOTH client and server-side initialization.
// Do not place any client-side-only configuration in this file.
export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Env var name for each required config field, so error messages point the
// developer at exactly what to add to .env.local (or apphosting.yaml in prod).
const REQUIRED_CONFIG: { key: keyof FirebaseOptions; envVar: string }[] = [
  { key: 'apiKey', envVar: 'NEXT_PUBLIC_FIREBASE_API_KEY' },
  { key: 'authDomain', envVar: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' },
  { key: 'projectId', envVar: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' },
  { key: 'storageBucket', envVar: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET' },
  { key: 'messagingSenderId', envVar: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID' },
  { key: 'appId', envVar: 'NEXT_PUBLIC_FIREBASE_APP_ID' },
];

/**
 * Returns the names of any required Firebase env vars that are missing/empty.
 * Used to fail fast with an actionable message instead of a cryptic
 * `auth/invalid-api-key` crash deep inside the Firebase SDK.
 */
export function getMissingFirebaseConfigVars(): string[] {
  return REQUIRED_CONFIG.filter(({ key }) => !firebaseConfig[key]).map(({ envVar }) => envVar);
}
