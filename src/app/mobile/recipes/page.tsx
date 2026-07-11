'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { MobileRecipesPageContent } from '@/components/nutri-planner/mobile-recipes-page-content';
import { MobileAssistant } from '@/components/nutri-planner/mobile-assistant';
import { MobileLoader } from '@/components/layout/mobile-loader';
import { useUser } from '@/firebase';

const MobilePageLoader = () => <MobileLoader label="Cargando tus recetas…" />;

function MobileRecipesWrapper() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        if (!userLoading && !user) {
            router.replace('/');
        }
    }, [userLoading, user, router]);

    const recipeState = useRecipeState();
    const weekPlanState = useWeekPlanState();
    const profileState = useUserProfileState();

    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    if (userLoading) {
        return <MobilePageLoader />;
    }

    return (
        <>
            {/* Recipe creation (blank / import from URL), "Añadir producto" and the
                recipe view/edit dialog all live inside the content component — a
                single dialog owner, so there's exactly one way in for each action. */}
            <MobileRecipesPageContent
                {...recipeState}
                onAssistantOpen={() => setIsAssistantOpen(true)}
            />
            <MobileAssistant
                isOpen={isAssistantOpen}
                onClose={() => setIsAssistantOpen(false)}
                recipeState={recipeState}
                weekPlanState={weekPlanState}
                profileState={profileState}
            />
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
