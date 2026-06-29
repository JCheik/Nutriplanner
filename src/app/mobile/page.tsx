'use client';

import { Suspense, useState } from 'react';
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
                autoListen
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
