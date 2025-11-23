'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Logo } from '@/components/icons/logo';
import dynamic from 'next/dynamic';

const MobileNav = dynamic(() => import('@/components/layout/mobile-nav').then(mod => mod.MobileNav), { ssr: false });

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
