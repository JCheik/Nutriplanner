'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { copyRecipeToUser, saveRecipeClient, deleteRecipeById } from '@/firebase/firestore-operations';
import { saveRecipe as saveRecipeAction } from '@/lib/actions';
import type { Recipe } from '@/lib/types';


export function useRecipeState() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isSaving, setIsSaving] = useState(false);

  // --- Firestore Data ---
  const userRecipesCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: userRecipes } = useCollection<Recipe>(userRecipesCollectionRef);

  const globalRecipesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'nutriplanner_recipes') : null, [firestore]);
  const { data: globalRecipes } = useCollection<Recipe>(globalRecipesCollectionRef);

  // --- Memoized Data Sources ---
  const currentUserRecipes = useMemo(() => userRecipes || [], [userRecipes]);
  const nutriplannerRecipes = useMemo(() => globalRecipes || [], [globalRecipes]);

  // --- Handlers ---
  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
    if (!user || !firestore) return;

    setIsSaving(true);
    try {
      let recipeName: string;
      if (imageFile) {
        // Image uploads need the Admin SDK (Storage) → go through the server action.
        // The action authenticates the caller from this token (the Admin SDK
        // bypasses Firestore rules, so authorization is enforced server-side).
        const idToken = await user.getIdToken();
        const result = await saveRecipeAction({ idToken, recipeData, imageFile, isGlobal, existingId });
        if (result.success) {
          recipeName = result.recipeName || recipeData.name;
        } else if (!isGlobal) {
          // Image upload failed (e.g. Storage not configured). Don't lose the whole
          // recipe — save it without the photo from the client and warn the user.
          const { imageUrl: _drop, ...withoutImage } = recipeData as Recipe;
          recipeName = await saveRecipeClient(firestore, user.uid, { ...withoutImage, imageUrl: '' }, isGlobal, existingId);
          toast({ variant: 'destructive', title: 'Receta guardada sin foto', description: 'No se pudo subir la imagen, pero la receta se guardó. Inténtalo de nuevo más tarde para añadir la foto.' });
          return;
        } else {
          throw new Error(result.error || 'Error desconocido al guardar la receta');
        }
      } else {
        // No image → write directly from the client. Works locally and respects
        // security rules, so it doesn't require a configured service account.
        recipeName = await saveRecipeClient(firestore, user.uid, recipeData, isGlobal, existingId);
      }
      toast({ title: '¡Receta guardada!', description: `${recipeName} se ha guardado correctamente.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al guardar la receta", description: error?.message || 'No se pudo guardar la receta.' });
      throw error; // let the caller know not to close the dialog
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = useCallback(async (recipeId: string, isGlobal: boolean) => {
    if (!user || !firestore) return;

    try {
      await deleteRecipeById(firestore, user.uid, recipeId, isGlobal);
      toast({ title: 'Receta eliminada', description: 'La receta se ha eliminado de tu librería.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.message || 'No se pudo eliminar la receta.' });
    }
  }, [user, firestore, toast]);


  const handleCopyRecipe = useCallback(async (recipe: Recipe) => {
    if (!user || !firestore) return;

    const { id, ...recipeData } = recipe; // Exclude original ID

    try {
      await copyRecipeToUser(firestore, user.uid, recipeData);
      toast({ title: '¡Receta Copiada!', description: `${recipe.name} ha sido añadida a "Mis Recetas".` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo copiar la receta.' });
    }
  }, [user, firestore, toast]);

  return {
    isSaving,
    currentUserRecipes,
    nutriplannerRecipes,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleCopyRecipe,
  };
}
