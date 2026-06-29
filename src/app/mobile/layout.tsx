'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Logo } from '@/components/icons/logo';
import { PageHeader } from '@/components/layout/page-header';
import { MobileNav } from '@/components/layout/mobile-nav';

const MobileLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
    </div>
);

function MobileAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/');
    }
  }, [userLoading, user, router]);

  if (userLoading || !user) {
    return <MobileLoader />;
  }

  return <>{children}</>;
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
        <PageHeader />
        <main className="flex-1 pb-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <Suspense fallback={<MobileLoader/>}>
            <MobileAuthGuard>
              {children}
            </MobileAuthGuard>
          </Suspense>
        </main>
        <Suspense>
         <MobileNav />
        </Suspense>
    </div>
  );
}
