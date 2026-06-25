'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Recipe } from '@/lib/types';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import type { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';


type PlannerState = ReturnType<typeof useRecipeState>;

interface MobileRecipesPageContentProps extends PlannerState {
    onAssistantOpen: () => void;
}

export function MobileRecipesPageContent({
    currentUserRecipes,
    nutriplannerRecipes,
    isSaving,
    handleCopyRecipe,
    handleSaveRecipe,
    handleDeleteRecipe,
    onAssistantOpen,
}: MobileRecipesPageContentProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { currentWeekPlan, handleRemoveRecipeFromMeal } = useWeekPlanState();

    const [dialogState, setDialogState] = useState<DialogState>({ open: false });

    const handleRecipeAction = (action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe: boolean = false) => {
        if (action === 'create') {
            setDialogState({ open: true, mode: 'create', isNutriPlannerRecipe });
        } else if (recipe) {
            setDialogState({ open: true, mode: action, recipe, isNutriPlannerRecipe });
        }
    };

    const handleDialogClose = () => setDialogState({ open: false });

    const handleInternalSave = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
        await handleSaveRecipe(recipeData, imageFile, isGlobal, existingId);
        handleDialogClose();
    };

    const handleInternalDelete = (recipeId: string, isGlobal: boolean) => {
        handleDeleteRecipe(recipeId, isGlobal);
        // Also remove from the week plan
        currentWeekPlan.forEach(dayPlan => {
            dayPlan.meals.forEach(meal => {
                meal.recipes.forEach(recipeInMeal => {
                    if (recipeInMeal.id === recipeId) {
                        handleRemoveRecipeFromMeal(dayPlan.day, meal.id, recipeInMeal.instanceId);
                    }
                });
            });
        });
        handleDialogClose();
    };
    
    const handleAddToPlan = () => {
        router.push('/mobile');
        toast({ title: 'Selecciona un destino', description: 'Toca una casilla de comida en el planificador para añadir la receta.' });
    };

    return (
        <>
            <div className="p-4 h-full">
                <RecipeLibrary
                    userRecipes={currentUserRecipes}
                    nutriplannerRecipes={nutriplannerRecipes}
                    onRecipeAction={handleRecipeAction}
                    onCopyRecipe={handleCopyRecipe}
                    onAddToPlan={handleAddToPlan}
                    onAssistantOpen={onAssistantOpen}
                    isMobile={true}
                    initialViewMode="grid"
                />
            </div>
            <RecipeDialog
                dialogState={dialogState}
                isSaving={isSaving}
                onClose={handleDialogClose}
                onSave={handleInternalSave}
                onDelete={handleInternalDelete}
                onEdit={(recipe, isNutri) => handleRecipeAction('edit', recipe, isNutri)}
                onCopy={handleCopyRecipe}
isMobile
            />
        </>
    )
}
