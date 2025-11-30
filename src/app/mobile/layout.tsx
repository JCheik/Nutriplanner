'use client';

import { Suspense, type ReactNode } from 'react';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PageHeader } from '@/components/layout/page-header';
import { MobileLayoutContent } from '@/components/nutri-planner/mobile-layout-content';
import { Logo } from '@/components/icons/logo';

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
    </div>
);


export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
       <Suspense fallback={<MobilePageLoader />} >
         <MobileLayoutContent>
            {children}
         </MobileLayoutContent>
       </Suspense>
    </div>
  );
}
