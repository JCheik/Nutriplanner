'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUser, useCollection, useFirestore, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { copyRecipeToUser, saveRecipeClient, deleteRecipeById } from '@/firebase/firestore-operations';
import type { Recipe } from '@/lib/types';


export function useRecipeState() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { storage } = useFirebase();

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
      if (imageFile && storage) {
        // Upload the photo and save the recipe entirely from the client. This
        // respects the Storage + Firestore security rules and, unlike the old
        // server action, does NOT need the Admin SDK — so it also works in local
        // dev, where the server-side service account isn't configured.
        try {
          recipeName = await saveRecipeClient(firestore, user.uid, recipeData, isGlobal, existingId, { storage, imageFile });
        } catch (imgError: any) {
          // Photo upload failed. Don't lose the whole recipe — save it without
          // the photo and tell the user WHY, so the cause is actionable
          // (unauthorized = Storage rules not deployed / signed out).
          console.error('Recipe image upload failed, saving without photo:', imgError);
          const code: string = imgError?.code ?? '';
          const reason =
            code === 'storage/unauthorized'
              ? 'Firebase rechazó la subida (reglas de Storage sin publicar o sesión caducada).'
              : code === 'storage/quota-exceeded'
              ? 'Se superó la cuota de almacenamiento.'
              : code === 'storage/retry-limit-exceeded'
              ? 'Problema de conexión: se agotaron los reintentos.'
              : code || imgError?.message || 'error desconocido';
          const { imageUrl: _drop, ...withoutImage } = recipeData as Recipe;
          recipeName = await saveRecipeClient(firestore, user.uid, { ...withoutImage, imageUrl: '' }, isGlobal, existingId);
          toast({ variant: 'destructive', title: 'Receta guardada sin foto', description: `No se pudo subir la imagen: ${reason}` });
          return;
        }
      } else {
        // No image → write directly from the client.
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
