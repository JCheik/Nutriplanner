'use client';

import { useEffect } from 'react';

/**
 * App-wide safety net. If any uncaught error bubbles up to the root (instead of
 * white-screening), the user gets a friendly message and a way to recover.
 * `global-error.tsx` replaces the whole document, so it must render <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            background: '#f8f7f4',
            color: '#1f2937',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Algo ha salido mal
          </h1>
          <p style={{ maxWidth: 420, color: '#6b7280', margin: 0 }}>
            Ha ocurrido un error inesperado. Puedes intentar recargar esta
            sección; si el problema continúa, recarga la página.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: 8,
                border: 'none',
                background: '#16a34a',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#1f2937',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
