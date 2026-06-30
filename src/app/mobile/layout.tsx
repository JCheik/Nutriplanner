'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { MobileLoader } from '@/components/layout/mobile-loader';

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
          <Suspense fallback={<MobileLoader />}>
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
