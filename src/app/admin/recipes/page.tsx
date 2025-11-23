'use client';
import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Recipe } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RecipeDialog, DialogState } from '@/components/nutri-planner/recipe-dialog';
import { RecipeCard } from '@/components/nutri-planner/recipe-card';
import { usePlannerState } from '@/hooks/use-planner-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export default function AdminRecipesPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    // Directly use the planner state hooks for actions, even though we get data differently.
    const { isSaving, handleSaveRecipe, handleDeleteRecipe } = usePlannerState();

    const globalRecipesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'nutriplanner_recipes') : null),
        [firestore]
    );
    const { data: globalRecipes, isLoading } = useCollection<Recipe>(globalRecipesRef);
    
    const [filter, setFilter] = useState('');
    const [dialogState, setDialogState] = useState<DialogState>({ open: false });

    const filteredRecipes = globalRecipes?.filter(recipe =>
        recipe.name.toLowerCase().includes(filter.toLowerCase())
    );

    const handleRecipeAction = (action: 'view' | 'create' | 'edit', recipe?: Recipe) => {
        setDialogState({
            open: true,
            mode: action,
            recipe: recipe,
            isNutriPlannerRecipe: true, // Always true in this context
        });
    };
    
    const handleSave = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
        if (!isGlobal) { // Double-check, should always be true here
            toast({ variant: "destructive", title: "Error", description: "Solo se pueden guardar recetas globales desde este panel." });
            return;
        }
        await handleSaveRecipe(recipeData, imageFile, true, existingId);
        setDialogState({ open: false });
    };

    const handleDelete = (recipeId: string) => {
        // Here, we can't use the planner's delete as it assumes user recipes.
        // We'll need a specific admin action later, for now we can stub it.
        toast({ title: 'Info', description: 'La eliminación de recetas globales requiere una acción de servidor específica (próximamente).' });
        console.log(`TODO: Implement admin-level delete for global recipe ${recipeId}`);
        setDialogState({ open: false });
    };


    return (
        <>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Recetas Globales de NutriPlanner</CardTitle>
                                    <CardDescription>Crear, ver y editar las recetas disponibles para todos los usuarios.</CardDescription>
                                </div>
                                <Button onClick={() => handleRecipeAction('create')}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nueva Receta Global
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre..."
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <ScrollArea className="h-[60vh]">
                                {isLoading && <p>Cargando recetas...</p>}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-4">
                                    {filteredRecipes && filteredRecipes.map(recipe => (
                                        <RecipeCard
                                            key={recipe.id}
                                            recipe={recipe}
                                            onClick={() => handleRecipeAction('view', recipe)}
                                        />
                                    ))}
                                </div>
                                {!isLoading && filteredRecipes?.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-muted-foreground">No se encontraron recetas.</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <RecipeDialog
                dialogState={dialogState}
                isSaving={isSaving}
                folders={[]} // No user folders in this context
                globalFolders={[]} // TODO: Populate global folders
                onClose={() => setDialogState({ open: false })}
                onSave={handleSave}
                onDelete={handleDelete}
                onEdit={(recipe) => handleRecipeAction('edit', recipe)}
                onCopy={() => { /* No copy functionality needed here */ }}
            />
        </>
    );
}
