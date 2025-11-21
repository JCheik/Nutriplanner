'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Recipe, Folder } from '@/lib/types';
import { INITIAL_RECIPES } from '@/lib/data';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';

function MobileRecipesPageContent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const isGuestMode = searchParams.get('guest') === 'true';

    const { user, loading: userLoading } = useUser();
    const { firestore } = useFirebase();

    const [dialogState, setDialogState] = useState<any>({ open: false });

    // --- Data Fetching ---
    const [guestRecipes] = useState<Recipe[]>(INITIAL_RECIPES);

    const userRecipesCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
    const { data: userRecipes, isLoading: userRecipesLoading } = useCollection<Recipe>(userRecipesCollectionRef);
    
    const nutriplannerRecipesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'nutriplanner_recipes') : null, [firestore]);
    const { data: nutriplannerRecipes, isLoading: nutriplannerRecipesLoading } = useCollection<Recipe>(nutriplannerRecipesCollectionRef);

    const foldersCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'folders') : null, [firestore, user]);
    const { data: folders, isLoading: foldersLoading } = useCollection<Folder>(foldersCollectionRef);

    const handleRecipeAction = (action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe?: boolean) => {
        setDialogState({ open: true, mode: action, recipe, isNutriPlannerRecipe });
    };

    const handleCopyRecipe = (recipe: Recipe) => {
        toast({ title: 'Copiado', description: `${recipe.name} ha sido añadido a tus recetas.` });
        // Add copy logic here if needed for mobile
    };

    if (userLoading || userRecipesLoading || nutriplannerRecipesLoading || foldersLoading) {
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
                    userRecipes={isGuestMode ? guestRecipes : userRecipes || []}
                    nutriplannerRecipes={nutriplannerRecipes || []}
                    folders={folders || []}
                    globalFolders={[]}
                    onRecipeAction={handleRecipeAction}
                    onCopyRecipe={handleCopyRecipe}
                    onAddToPlan={() => toast({title: "Función no disponible", description: "Arrastra recetas desde el ordenador."})}
                    onFolderCreate={() => {}}
                    onFolderUpdate={() => {}}
                    onFolderDelete={() => {}}
                    onAssignRecipeToFolder={() => {}}
                    onGlobalFolderCreate={() => {}}
                    onGlobalFolderUpdate={() => {}}
                    onGlobalFolderDelete={() => {}}
                    onAssignRecipeToGlobalFolder={() => {}}
                />
            </div>
            <RecipeDialog
                dialogState={dialogState}
                isSaving={false}
                folders={folders || []}
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


const MobilePageLoader = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
    </div>
);

export default function MobileRecipesPage() {
    return (
        <Suspense fallback={<MobilePageLoader />}>
            <MobileRecipesPageContent />
        </Suspense>
    );
}
