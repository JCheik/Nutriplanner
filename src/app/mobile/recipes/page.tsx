'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Logo } from '@/components/icons/logo';

const MobileRecipesPageContent = dynamic(() =>
    import('@/components/nutri-planner/mobile-recipes-page-content').then(mod => mod.MobileRecipesPageContent),
    {
        ssr: false,
        loading: () => <MobilePageLoader />,
    }
);

const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
            <Logo className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg text-muted-foreground">Cargando recetas...</p>
        </div>
    </div>
);

function MobileRecipesWrapper() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isGuestMode = searchParams.get('guest') === 'true';

    const { user, loading: userLoading } = useUser();
    const recipeState = useRecipeState({ isGuestMode });

    useEffect(() => {
        if (!userLoading && !isGuestMode && !user) {
            router.replace('/');
        }
    }, [userLoading, isGuestMode, user, router]);

    if (userLoading || (!isGuestMode && !user)) {
        return <MobilePageLoader />;
    }

    return (
        <>
            <PageHeader isGuest={isGuestMode} onRegisterClick={() => router.push('/')} />
            <main className="flex-1 pb-16">
                <MobileRecipesPageContent {...recipeState} isGuestMode={isGuestMode} />
            </main>
        </>
    );
}

export default function MobileRecipesPage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobileRecipesWrapper />
        </Suspense>
    );
}
