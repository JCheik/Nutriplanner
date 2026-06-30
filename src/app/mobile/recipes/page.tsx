'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeState } from '@/hooks/use-recipe-state';
import { useWeekPlanState } from '@/hooks/use-week-plan-state';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { MobileRecipesPageContent } from '@/components/nutri-planner/mobile-recipes-page-content';
import { MobileAssistant } from '@/components/nutri-planner/mobile-assistant';
import { MobileLoader } from '@/components/layout/mobile-loader';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Plus, PencilLine, Link2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { RecipeImportDialog } from '@/components/nutri-planner/recipe-import-dialog';
import type { Recipe } from '@/lib/types';

const MobilePageLoader = () => <MobileLoader label="Cargando tus recetas…" />;

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
    const [isImportOpen, setIsImportOpen] = useState(false);

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
            {/* Create actions: blank recipe or import from a URL (the URL import was
                previously desktop-only). */}
            <div className="fixed bottom-20 right-4 z-40">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="rounded-full h-14 w-14 shadow-lg" size="icon" aria-label="Añadir receta">
                            <Plus className="h-8 w-8" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end" className="bg-glass mb-2">
                        <DropdownMenuItem onClick={() => setDialogState({ open: true, mode: 'create' })}>
                            <PencilLine className="mr-2 h-4 w-4" /> Crear receta nueva
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                            <Link2 className="mr-2 h-4 w-4" /> Importar desde URL
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
            <RecipeImportDialog
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onRecipeImported={(recipe) => {
                    // Open the imported recipe in the editor for review before saving,
                    // same flow as the AI-generated recipes.
                    setIsImportOpen(false);
                    setDialogState({ open: true, mode: 'create', recipe: recipe as Recipe });
                }}
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
