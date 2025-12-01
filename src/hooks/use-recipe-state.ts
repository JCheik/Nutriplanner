'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { saveRecipe as saveRecipeAction } from '@/lib/actions';
import { NUTRIPLANNER_RECIPES_DATA } from '@/lib/data';
import type { Recipe, Folder } from '@/lib/types';

interface UseRecipeStateProps {
  isGuestMode?: boolean;
}

export function useRecipeState({ isGuestMode = false }: UseRecipeStateProps = {}) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [guestRecipes, setGuestRecipes] = useState<Recipe[]>(NUTRIPLANNER_RECIPES_DATA);
  const [isSaving, setIsSaving] = useState(false);

  // --- Firestore Data ---
  const userRecipesCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: userRecipes } = useCollection<Recipe>(userRecipesCollectionRef);

  const foldersCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'folders') : null, [firestore, user]);
  const { data: folders } = useCollection<Folder>(foldersCollectionRef);

  // --- Memoized Data Sources ---
  const currentUserRecipes = useMemo(() => isGuestMode ? guestRecipes : (userRecipes || []), [isGuestMode, guestRecipes, userRecipes]);
  const currentFolders = useMemo(() => isGuestMode ? [] : (folders || []), [isGuestMode, folders]);
  
  // --- Handlers ---
  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
    if (isGuestMode) {
      const newRecipe = { ...recipeData, id: existingId || self.crypto.randomUUID() } as Recipe;
      if (existingId) {
        setGuestRecipes(guestRecipes.map(r => r.id === existingId ? newRecipe : r));
      } else {
        setGuestRecipes([...guestRecipes, newRecipe]);
      }
      toast({ title: '¡Receta guardada (invitado)!', description: `${newRecipe.name} se ha guardado en esta sesión.` });
      return;
    }
    if (!user) return;

    setIsSaving(true);
    try {
      const result = await saveRecipeAction({ recipeData, imageFile, isGlobal, userId: user.uid, existingId });
      if (result.success) {
        toast({ title: '¡Receta guardada!', description: `${result.recipeName} se ha guardado correctamente.` });
      } else {
        throw new Error(result.error || 'Error desconocido al guardar la receta');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al guardar la receta", description: error.message || 'No se pudo guardar la receta.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = useCallback(async (recipeId: string, isGlobal: boolean) => {
    if (isGuestMode) {
      setGuestRecipes(recipes => recipes.filter(r => r.id !== recipeId));
      toast({ title: 'Receta eliminada (invitado)' });
      return;
    }

    if (!user || !firestore || !userRecipesCollectionRef) return;
    
    // Non-blocking delete for UI responsiveness
    deleteDocumentNonBlocking(doc(userRecipesCollectionRef, recipeId));

    // We still need to find a good way to clean up recipes from weekPlan without coupling hooks.
    // For now, this action is isolated to just deleting the recipe document.
    // A more advanced system might use a pub/sub model or a batch update in a server function.
    toast({ title: 'Receta eliminada', description: 'La receta se ha eliminado de tu librería.' });

  }, [user, firestore, userRecipesCollectionRef, toast, isGuestMode]);


  const handleCopyRecipe = useCallback((recipe: Recipe) => {
    if (isGuestMode) {
      setGuestRecipes(prev => [...prev, { ...recipe, id: self.crypto.randomUUID() }]);
      toast({ title: '¡Receta Copiada (invitado)!', description: `${recipe.name} ha sido añadida a "Mis Recetas" para esta sesión.` });
      return;
    }
    if (!user || !userRecipesCollectionRef) return;
    
    const { id, folderId, ...recipeData } = recipe; // Exclude original ID and folder
    const newRecipeRef = doc(userRecipesCollectionRef); // Let Firestore generate ID
    addDocumentNonBlocking(userRecipesCollectionRef, { ...recipeData, id: newRecipeRef.id, folderId: null });

    toast({ title: '¡Receta Copiada!', description: `${recipe.name} ha sido añadida a "Mis Recetas".` });
  }, [user, userRecipesCollectionRef, toast, isGuestMode]);


  const handleFolderCreate = useCallback((name: string) => {
    if (isGuestMode || !user || !foldersCollectionRef) return;
    addDocumentNonBlocking(foldersCollectionRef, { name, userId: user.uid });
    toast({ title: 'Carpeta creada', description: `La carpeta "${name}" ha sido creada.` });
  }, [user, foldersCollectionRef, isGuestMode, toast]);

  const handleFolderDelete = useCallback(async (id: string) => {
    if (isGuestMode || !user || !firestore) return;
    
    deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'folders', id));

    const batch = writeBatch(firestore);
    (userRecipes?.filter(r => r.folderId === id) || []).forEach(recipe => {
      batch.update(doc(firestore, 'users', user.uid, 'recipes', recipe.id), { folderId: null });
    });
    
    await batch.commit();
    toast({ title: 'Carpeta eliminada' });
  }, [user, firestore, userRecipes, isGuestMode, toast]);
  
  const handleFolderUpdate = useCallback((id: string, name: string) => {
    if (isGuestMode || !user || !firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'folders', id), { name });
  }, [user, firestore, isGuestMode]);

  const handleAssignRecipeToFolder = useCallback((recipeId: string, folderId: string | null) => {
    if (isGuestMode || !user || !firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'recipes', recipeId), { folderId });
    toast({ title: 'Receta movida' });
  }, [user, firestore, isGuestMode, toast]);

  return {
    isSaving,
    currentUserRecipes,
    nutriplannerRecipes: NUTRIPLANNER_RECIPES_DATA, // This is static global data
    currentFolders,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleCopyRecipe,
    handleFolderCreate,
    handleFolderDelete,
    handleFolderUpdate,
    handleAssignRecipeToFolder,
  };
}
