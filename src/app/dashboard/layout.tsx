'use client';

import { Suspense, useEffect } from 'react';
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

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/');
    }
  }, [userLoading, user, router]);

  if (userLoading || !user) {
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
