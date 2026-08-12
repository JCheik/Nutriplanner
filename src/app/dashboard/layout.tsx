'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Logo } from '@/components/icons/logo';
import { PageHeader } from '@/components/layout/page-header';
import { prefersDesktop } from '@/lib/mobile-redirect';
import { PortionFactorProvider } from '@/hooks/use-portion-factor';
import { useUserProfileState } from '@/hooks/use-user-profile-state';

// Explicit opaque bg-background: without it, the fixed kitchen-bg photo on
// <body> (background-attachment: fixed, see globals.css) shows through this
// transparent box during load — a jarring flash before the real content paints.
const DashboardLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu planificador...</p>
        </div>
    </div>
);

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  // Detect a mobile viewport on the very first client render so we never paint
  // the desktop dashboard before bouncing to /mobile. A mobile user can reach
  // /dashboard directly (an installed PWA launched at the old start_url, a tab
  // the browser restored, a shared link) and nothing else would route them to
  // the mobile UI — they'd be stuck on the desktop layout until clicking the logo.
  const [isMobileViewport] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches &&
      // Salvo que ya haya elegido quedarse en la web desde el aterrizaje móvil.
      !prefersDesktop()
  );

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (isMobileViewport) {
      router.replace('/mobile');
    }
  }, [userLoading, user, router, isMobileViewport]);

  if (userLoading || !user || isMobileViewport) {
    return <DashboardLoader />;
  }

  return <>{children}</>;
}

/** Lee el factor del perfil una vez y lo pone a disposición del árbol. */
function PortionFactorScope({ children }: { children: React.ReactNode }) {
  const { portionFactor } = useUserProfileState();
  return <PortionFactorProvider value={portionFactor}>{children}</PortionFactorProvider>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen text-foreground">
        <PageHeader />
        <Suspense fallback={<DashboardLoader />}>
            <AuthGuard>
                {/* El tamaño de plato se lee en media docena de sitios (tarjeta
                    de receta, ficha, modo cocina, cuadrante). Se reparte desde
                    aquí para no atravesarlos todos con una prop. */}
                <PortionFactorScope>
                    {children}
                </PortionFactorScope>
            </AuthGuard>
        </Suspense>
    </div>
  );
}
