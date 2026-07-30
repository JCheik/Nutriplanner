'use client';

import { Download, Monitor, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ChefieMascot } from '@/components/nutri-planner/chefie-mascot';
import { Button } from '@/components/ui/button';
import { APK_DOWNLOAD_URL } from '@/lib/constants';
import { rememberDesktopPreference } from '@/lib/mobile-redirect';

/**
 * Aterrizaje para móviles. Sustituye a la web móvil entera (7 rutas y ~1.800
 * líneas), retirada el 2026-07-30 ahora que existe la app nativa: mantener dos
 * interfaces móviles en paralelo salía caro y toda función nueva había que
 * hacerla dos veces.
 *
 * No se manda al móvil directo al escritorio a propósito: el planificador es de
 * arrastrar y soltar y en una pantalla pequeña se usa mal. Quien quiera entrar
 * igualmente tiene el enlace de abajo, que recuerda la preferencia para que la
 * redirección no lo devuelva aquí (ver `mobile-redirect.ts`).
 */
export default function MobileLandingPage() {
  const router = useRouter();

  const goToDesktop = () => {
    rememberDesktopPreference();
    router.replace('/dashboard');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-7 py-12 text-center">
      <ChefieMascot pose="celebrate" className="h-28 w-auto" />

      <div className="space-y-2">
        <h1 className="font-headline text-3xl font-bold leading-tight text-foreground">
          Nutrilp ahora es una app
        </h1>
        <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Hecha para el móvil de verdad: el cuadrante de la semana, la lista de la compra y el asistente, sin pelearte
          con una web pensada para pantalla grande.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        <Button asChild size="lg" className="w-full gap-2">
          <a href={APK_DOWNLOAD_URL} download>
            <Download className="h-4 w-4" />
            Descargar para Android
          </a>
        </Button>

        <Button variant="outline" size="lg" className="w-full gap-2" onClick={goToDesktop}>
          <Monitor className="h-4 w-4" />
          Seguir a la versión web
        </Button>
      </div>

      <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
        <Smartphone className="mr-1 inline h-3 w-3" />
        Todavía no hay versión para iPhone. Mientras tanto puedes usar la versión web con el botón de arriba — se ve
        mejor en horizontal.
      </p>

      <p className="text-xs text-muted-foreground">
        Es la misma cuenta y los mismos datos.{' '}
        <Link href="/privacidad" className="underline underline-offset-2">
          Privacidad
        </Link>
      </p>
    </main>
  );
}
