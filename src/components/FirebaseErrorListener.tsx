'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component that listens for globally emitted 'permission-error'
 * events coming from the Firestore hooks.
 *
 * Previously this threw the error during render, which crashed the ENTIRE app
 * (there is no error.tsx boundary) whenever any read hit a permission denial —
 * e.g. a transient state during sign-in, or a collection the user can't read.
 *
 * Instead we now degrade gracefully: log the full, security-rule-shaped payload
 * to the console (so developers can still debug rules) and show a non-blocking
 * toast to the user. The app keeps running.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Keep the rich, debuggable payload available in the console.
      console.error('[Firestore permission error]', error.message, error.request);

      toast({
        variant: 'destructive',
        title: 'Permiso denegado',
        description:
          'No se pudo acceder a algunos datos. Revisa tu conexión o vuelve a iniciar sesión.',
      });
    };

    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, [toast]);

  // This component renders nothing.
  return null;
}
