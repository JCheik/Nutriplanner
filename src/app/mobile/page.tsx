'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useWeekHistory } from '@/hooks/use-week-history';
import { useAiQuota } from '@/hooks/use-ai-quota';
import { useToast } from '@/hooks/use-toast';
import { MobilePageContent } from '@/components/nutri-planner/mobile-page-content';
import { MobileAssistant } from '@/components/nutri-planner/mobile-assistant';
import { WeekHistorySheet } from '@/components/nutri-planner/week-history-sheet';
import { AutocompletePreferencesDialog, type AutocompletePreferences } from '@/components/nutri-planner/autocomplete-preferences-dialog';
import { MobileLoader } from '@/components/layout/mobile-loader';
import { autocompleteWeek } from '@/ai/flows/autocomplete-flow';
import { autocompleteToast } from '@/lib/autocomplete-summary';
import { getAiErrorMessage } from '@/lib/ai-error';

const MobilePageLoader = () => <MobileLoader label="Cargando tu plan…" />;

function MobilePageWrapper() {
    const recipeState = useRecipeState();
    const weekPlanState = useWeekPlanState();
    const profileState = useUserProfileState();
    const { history, isLoading: historyLoading, saveCurrentWeek, deleteSnapshot } = useWeekHistory();

    const { check: checkAiQuota } = useAiQuota();
    const { toast } = useToast();

    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAutocompletePrefsOpen, setIsAutocompletePrefsOpen] = useState(false);
    const [isAutocompleting, setIsAutocompleting] = useState(false);

    // Close the assistant chat first; otherwise the preferences dialog opens
    // hidden behind the full-screen assistant and nothing seems to happen.
    const handleOpenAutocomplete = useCallback(() => {
        setIsAssistantOpen(false);
        setIsAutocompletePrefsOpen(true);
    }, []);

    const handleAutocompleteConfirm = useCallback(async (preferences: AutocompletePreferences) => {
        setIsAutocompletePrefsOpen(false);
        const quota = await checkAiQuota();
        if (!quota.allowed) {
            toast({ title: 'Límite de IA', description: quota.message ?? 'Has alcanzado el límite de peticiones de IA por hoy.' });
            return;
        }
        setIsAutocompleting(true);
        try {
            const availableRecipes = [...recipeState.currentUserRecipes, ...recipeState.nutriplannerRecipes];
            const { placements, unfilled } = await autocompleteWeek({
                weekPlan: weekPlanState.currentWeekPlan,
                availableRecipes,
                activeGoal: profileState.activeGoalMacros || null,
                preferences: {
                    ...preferences,
                    diet: profileState.currentDietPreference,
                },
            });
            placements.forEach(p => {
                const recipe = availableRecipes.find(r => r.id === p.recipeId);
                if (recipe) weekPlanState.handleDrop(p.day, p.mealId, recipe, p.servings);
            });
            toast(autocompleteToast(placements.length, unfilled));
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error al autocompletar', description: getAiErrorMessage(e, 'No se pudo generar el plan semanal.') });
        } finally {
            setIsAutocompleting(false);
        }
    }, [checkAiQuota, toast, recipeState, weekPlanState, profileState]);

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
                onOpenAutocomplete={handleOpenAutocomplete}
                onHistorialOpen={() => setIsHistoryOpen(true)}
                isAutocompleting={isAutocompleting}
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
            <AutocompletePreferencesDialog
                isOpen={isAutocompletePrefsOpen}
                onClose={() => setIsAutocompletePrefsOpen(false)}
                onConfirm={handleAutocompleteConfirm}
                isLoading={isAutocompleting}
                hasGoal={!!profileState.activeGoalMacros}
            />
            <MobileAssistant
                isOpen={isAssistantOpen}
                onClose={() => setIsAssistantOpen(false)}
                recipeState={recipeState}
                weekPlanState={weekPlanState}
                profileState={profileState}
                onOpenAutocomplete={handleOpenAutocomplete}
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
