import { type ReactNode, Suspense } from 'react';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Logo } from '@/components/icons/logo';


const MobileLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
    </div>
);


export default function MobileLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            <Suspense fallback={<MobileLoader />}>
                {children}
            </Suspense>
            <MobileNav />
        </div>
    );
}
