'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { MobileRecipesPageContent } from '@/components/nutri-planner/mobile-recipes-page-content';
import { Logo } from '@/components/icons/logo';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { AssistantDialog } from '@/components/nutri-planner/assistant-dialog';
import { autocompleteWeek } from '@/ai/flows/autocomplete-flow';
import { getAiErrorMessage } from '@/lib/ai-error';
import { useToast } from '@/hooks/use-toast';
import type { Recipe, AiIngredientEstimate } from '@/lib/types';

const MobilePageLoader = () => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
            <Logo className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg text-muted-foreground">Cargando recetas...</p>
        </div>
    </div>
);

function MobileRecipesWrapper() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        if (!userLoading && !user) {
            router.replace('/');
        }
    }, [userLoading, user, router]);

    const recipeState = useRecipeState();
    const weekPlanState = useWeekPlanState();
    const profileState = useUserProfileState();

    const [dialogState, setDialogState] = useState<DialogState>({ open: false });
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    const handleAiRecipeGenerated = (recipe: Omit<Recipe, 'id'>, aiIngredients?: AiIngredientEstimate[]) => {
        setDialogState({
            open: true,
            mode: 'create',
            recipe: recipe as Recipe,
            aiIngredients,
        });
    };

    const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
        await recipeState.handleSaveRecipe(recipeData, imageFile, isGlobal, existingId);
        setDialogState({ open: false });
    };

    // Mobile has no autocomplete-preferences dialog, so the assistant's
    // `autocomplete_week` action runs the flow directly with sensible defaults.
    const handleAutocomplete = useCallback(async () => {
        try {
            const availableRecipes = [...recipeState.currentUserRecipes, ...recipeState.nutriplannerRecipes];
            const placements = await autocompleteWeek({
                weekPlan: weekPlanState.currentWeekPlan,
                availableRecipes,
                activeGoal: profileState.activeGoalMacros || null,
                preferences: {
                    allowRepetition: 'max_twice',
                    priority: profileState.activeGoalMacros ? 'goal' : 'protein',
                    dietaryRestrictions: '',
                    goalMarginPercent: 15,
                    diet: profileState.currentDietPreference,
                },
            });
            if (Array.isArray(placements)) {
                placements.forEach(p => {
                    const recipe = availableRecipes.find(r => r.id === p.recipeId);
                    if (recipe) weekPlanState.handleDrop(p.day, p.mealId, recipe, p.servings);
                });
                toast({ title: 'Semana autocompletada', description: 'Se han rellenado los huecos vacíos de tu planificador.' });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error al autocompletar', description: getAiErrorMessage(e, 'No se pudo generar el plan semanal.') });
        }
    }, [recipeState.currentUserRecipes, recipeState.nutriplannerRecipes, weekPlanState, profileState, toast]);

    if (userLoading) {
        return <MobilePageLoader />;
    }

    return (
        <>
            <MobileRecipesPageContent
                {...recipeState}
                onAssistantOpen={() => setIsAssistantOpen(true)}
            />
            <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3">
                <Button className="rounded-full h-14 w-14 shadow-lg" size="icon" onClick={() => setDialogState({ open: true, mode: 'create' })}>
                    <Plus className="h-8 w-8" />
                </Button>
            </div>
            <RecipeDialog
                dialogState={dialogState}
                isSaving={recipeState.isSaving}
                onClose={() => setDialogState({ open: false })}
                onSave={handleSaveRecipe}
                onDelete={recipeState.handleDeleteRecipe}
                onEdit={(recipe, isGlobal) => setDialogState({ open: true, mode: 'edit', recipe, isNutriPlannerRecipe: isGlobal })}
                onCopy={recipeState.handleCopyRecipe}
                isMobile
            />
            <AssistantDialog
                isOpen={isAssistantOpen}
                onClose={() => setIsAssistantOpen(false)}
                weekPlan={weekPlanState.currentWeekPlan}
                userRecipes={recipeState.currentUserRecipes}
                nutriplannerRecipes={recipeState.nutriplannerRecipes}
                activeGoalMacros={profileState.activeGoalMacros || null}
                dietPreference={profileState.currentDietPreference}
                onDrop={weekPlanState.handleDrop}
                onClearMeal={weekPlanState.handleClearMeal}
                onClearDay={weekPlanState.handleClearDay}
                onClearWeek={weekPlanState.handleClearWeek}
                onAutocomplete={handleAutocomplete}
                onSetGoal={profileState.handleActiveGoalChange}
                onCreateRecipe={handleAiRecipeGenerated}
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
