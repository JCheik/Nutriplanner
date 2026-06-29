'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Logo } from '@/components/icons/logo';
import { PageHeader } from '@/components/layout/page-header';

const DashboardLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
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
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
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
                {children}
            </AuthGuard>
        </Suspense>
    </div>
  );
}
