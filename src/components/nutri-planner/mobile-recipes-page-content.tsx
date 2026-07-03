'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Recipe } from '@/lib/types';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { ProductDialog } from '@/components/nutri-planner/product-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, ScanBarcode } from 'lucide-react';
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
    const [isProductOpen, setIsProductOpen] = useState(false);

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
            <div className="p-4 h-full flex flex-col gap-3">
                {/* Create actions — a recipe you cook, or a supermarket product
                    (scan/search in Open Food Facts or type its macros). */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleRecipeAction('create')}>
                        <PlusCircle className="mr-1.5 h-4 w-4" />
                        Nueva receta
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsProductOpen(true)}>
                        <ScanBarcode className="mr-1.5 h-4 w-4" />
                        Añadir producto
                    </Button>
                </div>
                <div className="flex-1 min-h-0">
                    <RecipeLibrary
                        userRecipes={currentUserRecipes}
                        nutriplannerRecipes={nutriplannerRecipes}
                        onRecipeAction={handleRecipeAction}
                        onCopyRecipe={handleCopyRecipe}
                        onAddToPlan={handleAddToPlan}
                        onAssistantOpen={onAssistantOpen}
                        isMobile={true}
                        initialViewMode="list"
                    />
                </div>
            </div>
            <ProductDialog
                isOpen={isProductOpen}
                onClose={() => setIsProductOpen(false)}
                isSaving={isSaving}
                onSave={async (recipeData) => {
                    await handleSaveRecipe(recipeData, null, false);
                    setIsProductOpen(false);
                    toast({ title: 'Producto guardado', description: `«${recipeData.name}» ya está en tus recetas.` });
                }}
            />
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
