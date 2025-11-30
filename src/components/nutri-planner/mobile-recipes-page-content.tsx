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
    isGuestMode: boolean;
}

export function MobileRecipesPageContent({
    currentUserRecipes,
    nutriplannerRecipes,
    currentFolders,
    isGuestMode,
    isSaving,
    handleCopyRecipe,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleFolderCreate,
    handleFolderUpdate,
    handleFolderDelete,
    handleAssignRecipeToFolder
}: MobileRecipesPageContentProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { currentWeekPlan, handleRemoveRecipeFromMeal } = useWeekPlanState({ isGuestMode });

    const [dialogState, setDialogState] = useState<DialogState>({ open: false });

    const handleRecipeAction = (action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe: boolean = false) => {
        if (isGuestMode && action !== 'view') {
            toast({
                variant: 'destructive',
                title: 'Función no disponible',
                description: 'Inicia sesión para crear o editar recetas.',
            });
            return;
        }
        setDialogState({ open: true, mode: action, recipe, isNutriPlannerRecipe });
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
        router.push(isGuestMode ? '/mobile?guest=true' : '/mobile');
        toast({ title: 'Selecciona un destino', description: 'Toca una casilla de comida en el planificador para añadir la receta.' });
    };

    return (
        <>
            <div className="p-4 h-full">
                <RecipeLibrary
                    userRecipes={currentUserRecipes}
                    nutriplannerRecipes={nutriplannerRecipes}
                    folders={currentFolders}
                    globalFolders={[]}
                    onRecipeAction={handleRecipeAction}
                    onCopyRecipe={handleCopyRecipe}
                    onAddToPlan={handleAddToPlan}
                    onFolderCreate={handleFolderCreate}
                    onFolderUpdate={handleFolderUpdate}
                    onFolderDelete={handleFolderDelete}
                    onAssignRecipeToFolder={handleAssignRecipeToFolder}
                    onGlobalFolderCreate={() => {}} // No admin features on mobile
                    onGlobalFolderUpdate={() => {}}
                    onGlobalFolderDelete={() => {}}
                    onAssignRecipeToGlobalFolder={() => {}}
                    isMobile={true}
                    initialViewMode="grid"
                />
            </div>
            <RecipeDialog
                dialogState={dialogState}
                isSaving={isSaving}
                folders={currentFolders}
                globalFolders={[]}
                onClose={handleDialogClose}
                onSave={handleInternalSave}
                onDelete={handleInternalDelete}
                onEdit={handleRecipeAction}
                onCopy={handleCopyRecipe}
                isMobile
            />
        </>
    )
}
