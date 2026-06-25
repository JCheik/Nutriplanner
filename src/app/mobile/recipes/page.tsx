'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { MobileRecipesPageContent } from '@/components/nutri-planner/mobile-recipes-page-content';
import { MobileAssistant } from '@/components/nutri-planner/mobile-assistant';
import { Logo } from '@/components/icons/logo';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import type { Recipe } from '@/lib/types';

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

    const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
        await recipeState.handleSaveRecipe(recipeData, imageFile, isGlobal, existingId);
        setDialogState({ open: false });
    };

    if (userLoading) {
        return <MobilePageLoader />;
    }

    return (
        <>
            <MobileRecipesPageContent
                {...recipeState}
                onAssistantOpen={() => setIsAssistantOpen(true)}
            />
            {/* New blank recipe */}
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
