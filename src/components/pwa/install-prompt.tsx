'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import { useOnboardingFlag } from '@/hooks/use-onboarding';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Discreet "install app" banner. On Chromium it uses the native
 * `beforeinstallprompt` event; on iOS Safari (which has no such event) it shows
 * the manual "Compartir → Añadir a pantalla de inicio" instruction. Dismissed
 * forever via the onboarding flag so it never nags.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [available, setAvailable] = useState(false);
  const { shouldShow, dismiss, dismissForever } = useOnboardingFlag('install-prompt');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already installed → never show.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    if (ios) {
      setIsIOS(true);
      setAvailable(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setAvailable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!available || !shouldShow) return null;

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    }
    dismissForever();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-xl border bg-glass p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold">Instala Nutrilp</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground">
              Toca <Share className="inline h-3 w-3" /> Compartir y luego “Añadir a pantalla de
              inicio” para usarla como una app.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Añádela a tu pantalla de inicio para abrirla a pantalla completa, como una app.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {!isIOS && (
              <Button size="sm" className="h-7 text-xs" onClick={handleInstall}>
                Instalar
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => dismissForever()}
            >
              No volver a mostrar
            </Button>
          </div>
        </div>
        <button
          aria-label="Cerrar"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => dismiss()}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
