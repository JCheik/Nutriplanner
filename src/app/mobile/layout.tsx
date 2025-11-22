'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PageHeader } from '@/components/layout/page-header';
import { Logo } from '@/components/icons/logo';

const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    // Simple check, can be improved
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
    </div>
);


export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();

  useEffect(() => {
    // If user is on desktop and lands on a mobile page, redirect them away
    if (!isMobileDevice()) {
      router.replace('/');
    }
  }, [router]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader />
      <main className="flex-1 pb-16">
        <Suspense fallback={<MobilePageLoader />}>
          {children}
        </Suspense>
      </main>
      <MobileNav />
    </div>
  )
}
