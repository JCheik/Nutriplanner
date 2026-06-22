/**
 * @fileoverview Server-side Firebase initialization.
 * This file is NOT for client-side use and should only be imported in Server Actions or API routes.
 */

import { initializeApp, getApps, cert, type AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// Reconstruct the service account from individual environment variables or JSON string
let serviceAccount: { projectId?: string; clientEmail?: string; privateKey?: string } | undefined = undefined;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    serviceAccount = {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key?.replace(/\\n/g, '\n'),
    };
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
  }
}

if (!serviceAccount) {
  serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

// Check if the essential service account properties are available.
const hasServiceAccount = serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey;

// Use the client-side config for project details and add credentials for admin access.
const adminConfig: AppOptions = {
  credential: hasServiceAccount ? cert(serviceAccount) : undefined,
  projectId: serviceAccount.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

/**
 * Initializes and returns the Firebase Admin SDK services.
 * Ensures that the app is initialized only once (singleton pattern).
 */
export function initializeFirebase() {
  if (!getApps().length) {
    if (hasServiceAccount) {
      initializeApp(adminConfig);
    } else {
      // No explicit credentials — on Firebase App Hosting, ADC is provided automatically
      // by the runtime. Omitting `credential` lets the SDK pick it up via ADC.
      initializeApp({
        projectId: serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  }
  
  // Return the services. If initialization failed, these will throw errors
  // when used, which is the expected behavior.
  return {
    firestore: getFirestore(),
    storage: getStorage(),
    auth: getAuth(),
  };
}
