'use client';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';

// this is a workaround for a bug in nextjs
// where the context provider is not shared between pages.
const { firebaseApp, firestore, auth } = initializeFirebase();

export const FirebaseClientProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      firestore={firestore}
      auth={auth}
    >
      {children}
    </FirebaseProvider>
  );
};
