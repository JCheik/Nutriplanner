'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useWeekHistory } from '@/hooks/use-week-history';
import { MobilePageContent } from '@/components/nutri-planner/mobile-page-content';
import { MobileAssistant } from '@/components/nutri-planner/mobile-assistant';
import { WeekHistorySheet } from '@/components/nutri-planner/week-history-sheet';
import { Logo } from '@/components/icons/logo';

const MobilePageLoader = () => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu plan...</p>
        </div>
    </div>
);

function MobilePageWrapper() {
    const recipeState = useRecipeState();
    const weekPlanState = useWeekPlanState();
    const profileState = useUserProfileState();
    const { history, isLoading: historyLoading, saveCurrentWeek, deleteSnapshot } = useWeekHistory();

    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // The bottom-nav "Asistente IA" item links here with ?assistant=1. Open the
    // assistant and clean the URL so re-tapping it works again.
    const router = useRouter();
    const searchParams = useSearchParams();
    useEffect(() => {
        if (searchParams.get('assistant') === '1') {
            setIsAssistantOpen(true);
            router.replace('/mobile');
        }
    }, [searchParams, router]);

    const combinedState = {
        ...recipeState,
        ...weekPlanState,
    };

    return (
        <>
            <MobilePageContent
                {...combinedState}
                activeGoalMacros={profileState.activeGoalMacros || null}
                dietPreference={profileState.currentDietPreference}
                onAssistantOpen={() => setIsAssistantOpen(true)}
                onHistorialOpen={() => setIsHistoryOpen(true)}
            />
            <WeekHistorySheet
                isOpen={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                weekPlan={weekPlanState.currentWeekPlan ?? []}
                history={history}
                isLoading={historyLoading}
                onSave={saveCurrentWeek}
                onDelete={deleteSnapshot}
                onRestore={(days) => {
                    weekPlanState.handleRestoreWeek(days);
                    setIsHistoryOpen(false);
                }}
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

export default function MobilePage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobilePageWrapper />
        </Suspense>
    )
}
