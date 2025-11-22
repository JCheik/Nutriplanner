'use client';

// Added to ensure the page is rendered dynamically, as it uses searchParams.
export const dynamic = 'force-dynamic';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePlannerState } from '@/hooks/use-planner-state';
import type { Recipe, Folder } from '@/lib/types';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';

function MobileRecipesPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const isGuestMode = searchParams.get('guest') === 'true';

    const {
        currentUserRecipes,
        nutriplannerRecipes,
        currentFolders,
        isLoading,
        handleCopyRecipe,
    } = usePlannerState({ isGuestMode });


    const [dialogState, setDialogState] = useState<any>({ open: false });

    const handleRecipeAction = (action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe?: boolean) => {
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

    if (isLoading) {
         return (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
                <Logo className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-lg text-muted-foreground">Cargando recetas...</p>
                </div>
            </div>
        );
    }

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
                    onAddToPlan={() => router.push(isGuestMode ? '/mobile?guest=true' : '/mobile')}
                    onFolderCreate={() => {}}
                    onFolderUpdate={() => {}}
                    onFolderDelete={() => {}}
                    onAssignRecipeToFolder={() => {}}
                    onGlobalFolderCreate={() => {}}
                    onGlobalFolderUpdate={() => {}}
                    onGlobalFolderDelete={() => {}}
                    onAssignRecipeToGlobalFolder={() => {}}
                    isMobile={true}
                    initialViewMode="list"
                />
            </div>
            <RecipeDialog
                dialogState={dialogState}
                isSaving={false}
                folders={currentFolders}
                globalFolders={[]}
                onClose={() => setDialogState({ open: false })}
                onSave={() => {}}
                onDelete={() => {}}
                onEdit={handleRecipeAction}
                onCopy={handleCopyRecipe}
            />
        </>
    )
}


export default function MobileRecipesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <Logo className="h-12 w-12 text-primary animate-pulse" />
            </div>
        }>
            <MobileRecipesPageContent />
        </Suspense>
    );
}
