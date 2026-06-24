'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * Route-level error boundary. Catches render/runtime errors thrown by a page
 * (or its children) and lets the user recover without a full reload, keeping
 * the app shell intact. The root global-error.tsx is the last-resort fallback
 * for errors in the root layout itself.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-semibold">Algo ha salido mal</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Ha ocurrido un error inesperado en esta sección. Puedes reintentar; si el
        problema continúa, vuelve al inicio.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Reintentar</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
