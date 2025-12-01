'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { MobileRecipesPageContent } from '@/components/nutri-planner/mobile-recipes-page-content';
import { Logo } from '@/components/icons/logo';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { RecipeChatDialog } from '@/components/nutri-planner/recipe-chat-dialog';
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
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const isGuestMode = searchParams.get('guest') === 'true';

    useEffect(() => {
        if (!userLoading && !user && !isGuestMode) {
            router.replace('/');
        }
    }, [userLoading, user, isGuestMode, router]);

    const recipeState = useRecipeState({ isGuestMode });

    const [dialogState, setDialogState] = useState<DialogState>({ open: false });
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);

    const handleAiRecipeGenerated = (recipe: Omit<Recipe, 'id'>) => {
        setDialogState({
            open: true,
            mode: 'create',
            recipe: recipe as Recipe,
        });
    };
    
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
                isGuestMode={isGuestMode}
                onAiRecipeGenerated={handleAiRecipeGenerated}
            />
            <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3">
                <Button className="rounded-full h-14 w-14 shadow-lg" size="icon" onClick={() => setIsAiChatOpen(true)}>
                    <Sparkles className="h-7 w-7" />
                </Button>
                <Button className="rounded-full h-14 w-14 shadow-lg" size="icon" onClick={() => setDialogState({ open: true, mode: 'create' })}>
                    <Plus className="h-8 w-8" />
                </Button>
            </div>
            <RecipeDialog
                dialogState={dialogState}
                isSaving={recipeState.isSaving}
                folders={recipeState.currentFolders}
                globalFolders={[]}
                onClose={() => setDialogState({ open: false })}
                onSave={handleSaveRecipe}
                onDelete={recipeState.handleDeleteRecipe}
                onEdit={(recipe, isGlobal) => setDialogState({ open: true, mode: 'edit', recipe, isNutriPlannerRecipe: isGlobal })}
                onCopy={recipeState.handleCopyRecipe}
                isMobile
            />
            <RecipeChatDialog
                isOpen={isAiChatOpen}
                onClose={() => setIsAiChatOpen(false)}
                onRecipeGenerated={handleAiRecipeGenerated}
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
