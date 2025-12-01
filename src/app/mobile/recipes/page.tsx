'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { MobileRecipesPageContent } from '@/components/nutri-planner/mobile-recipes-page-content';
import { Logo } from '@/components/icons/logo';
import { useUser } from '@/firebase';
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
    const router = useRouter();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        if (!userLoading && !user) {
            router.replace('/');
        }
    }, [userLoading, user, router]);

    const recipeState = useRecipeState();

    const [dialogState, setDialogState] = useState<DialogState>({ open: false });
    const [activePanel, setActivePanel] = useState<'ai-chat' | null>(null);

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

    const handlePanelOpen = (panel: 'goals' | 'shopping-list' | 'sticky-note' | 'ai-chat') => {
        if (panel === 'ai-chat') {
            setActivePanel(activePanel === 'ai-chat' ? null : 'ai-chat');
        } else if (panel === 'shopping-list') {
            router.push('/mobile/shopping-list');
        }
    }
  
    const handlePanelChange = (panel: 'ai-chat', isOpen: boolean) => {
      setActivePanel(isOpen ? panel : null);
    }

    if (userLoading) {
        return <MobilePageLoader />;
    }

    return (
        <>
            <MobileRecipesPageContent
                {...recipeState}
                onAiRecipeGenerated={handleAiRecipeGenerated}
                onAiChatOpen={() => handlePanelOpen('ai-chat')}
            />
            <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3">
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
                isOpen={activePanel === 'ai-chat'}
                onClose={() => handlePanelChange('ai-chat', false)}
                onRecipeGenerated={handleAiRecipeGenerated}
                nutritionalGoal={null} // Mobile view does not have active goals context, can be added later
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
