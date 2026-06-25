'use client';

import { useEffect } from 'react';

/**
 * Registers the hand-written service worker (public/sw.js) in production only.
 * In development we skip it to avoid the stale-cache issues that come from mixing
 * a service worker with Turbopack's dev assets.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((e) => console.error('Service worker registration failed', e));
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
