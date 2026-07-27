import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
// @ts-expect-error — getReactNativePersistence exists in firebase/auth's
// react-native bundle (which Metro resolves) but is missing from the public
// web typings; long-standing upstream issue (firebase-js-sdk#7584).
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

/**
 * Same Firebase project as the web app — the user signs in with the same
 * account and sees the same plan/recipes/interview. Public client config comes
 * from native/.env (EXPO_PUBLIC_* vars, gitignored; recreate by hand from the
 * web's .env.local if lost).
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const alreadyInitialized = getApps().length > 0;
export const firebaseApp = alreadyInitialized ? getApps()[0] : initializeApp(firebaseConfig);

// On native, auth state persists across app restarts via AsyncStorage; the
// web build (Expo web / react-native-web) uses the browser default instead —
// initializeAuth with RN persistence would break there.
let authInstance: Auth;
if (alreadyInitialized) {
  authInstance = getAuth(firebaseApp);
} else if (Platform.OS === 'web') {
  authInstance = getAuth(firebaseApp);
} else {
  authInstance = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
export const auth = authInstance;

export const firestore = getFirestore(firebaseApp);
