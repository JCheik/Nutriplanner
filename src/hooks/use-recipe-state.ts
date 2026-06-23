'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { deleteFolderAndUnlinkRecipes, copyRecipeToUser, saveRecipeClient, deleteRecipeById } from '@/firebase/firestore-operations';
import { addDoc, updateDoc } from 'firebase/firestore';
import { saveRecipe as saveRecipeAction } from '@/lib/actions';
import type { Recipe, Folder, GlobalFolder } from '@/lib/types';


export function useRecipeState() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isSaving, setIsSaving] = useState(false);

  // --- Firestore Data ---
  const userRecipesCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: userRecipes } = useCollection<Recipe>(userRecipesCollectionRef);

  const foldersCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'folders') : null, [firestore, user]);
  const { data: folders } = useCollection<Folder>(foldersCollectionRef);

  const globalRecipesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'nutriplanner_recipes') : null, [firestore]);
  const { data: globalRecipes } = useCollection<Recipe>(globalRecipesCollectionRef);

  const globalFoldersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'nutriplanner_folders') : null, [firestore]);
  const { data: globalFolders } = useCollection<GlobalFolder>(globalFoldersCollectionRef);

  // --- Memoized Data Sources ---
  const currentUserRecipes = useMemo(() => userRecipes || [], [userRecipes]);
  const currentFolders = useMemo(() => folders || [], [folders]);
  const nutriplannerRecipes = useMemo(() => globalRecipes || [], [globalRecipes]);
  const currentGlobalFolders = useMemo(() => globalFolders || [], [globalFolders]);
  
  // --- Handlers ---
  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
    if (!user || !firestore) return;

    setIsSaving(true);
    try {
      let recipeName: string;
      if (imageFile) {
        // Image uploads need the Admin SDK (Storage) → go through the server action.
        const result = await saveRecipeAction({ recipeData, imageFile, isGlobal, userId: user.uid, existingId });
        if (!result.success) {
          throw new Error(result.error || 'Error desconocido al guardar la receta');
        }
        recipeName = result.recipeName || recipeData.name;
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
    
    const { id, folderId, ...recipeData } = recipe; // Exclude original ID and folder
    
    try {
      await copyRecipeToUser(firestore, user.uid, recipeData);
      toast({ title: '¡Receta Copiada!', description: `${recipe.name} ha sido añadida a "Mis Recetas".` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo copiar la receta.' });
    }
  }, [user, firestore, toast]);


  const handleFolderCreate = useCallback(async (name: string) => {
    if (!user || !foldersCollectionRef) return;
    try {
      await addDoc(foldersCollectionRef, { name, userId: user.uid });
      toast({ title: 'Carpeta creada', description: `La carpeta "${name}" ha sido creada.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo crear la carpeta.' });
    }
  }, [user, foldersCollectionRef, toast]);

  const handleFolderDelete = useCallback(async (id: string) => {
    if (!user || !firestore) return;
    
    try {
      const linkedRecipeIds = userRecipes?.filter(r => r.folderId === id).map(r => r.id) || [];
      await deleteFolderAndUnlinkRecipes(firestore, user.uid, id, false, linkedRecipeIds);
      toast({ title: 'Carpeta eliminada' });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo eliminar la carpeta.' });
    }
  }, [user, firestore, userRecipes, toast]);
  
  const handleFolderUpdate = useCallback(async (id: string, name: string) => {
    if (!user || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'users', user.uid, 'folders', id), { name });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo actualizar la carpeta.' });
    }
  }, [user, firestore, toast]);

  const handleAssignRecipeToFolder = useCallback(async (recipeId: string, folderId: string | null) => {
    if (!user || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'users', user.uid, 'recipes', recipeId), { folderId });
      toast({ title: 'Receta movida' });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo mover la receta.' });
    }
  }, [user, firestore, toast]);

  const handleGlobalFolderCreate = useCallback(async (name: string) => {
    if (!user || !globalFoldersCollectionRef) return;
    try {
      await addDoc(globalFoldersCollectionRef, { name });
      toast({ title: 'Carpeta global creada', description: `La carpeta "${name}" ha sido creada.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo crear la carpeta global.' });
    }
  }, [user, globalFoldersCollectionRef, toast]);

  const handleGlobalFolderDelete = useCallback(async (id: string) => {
    if (!user || !firestore) return;
    
    try {
      const linkedRecipeIds = globalRecipes?.filter(r => r.folderId === id).map(r => r.id) || [];
      await deleteFolderAndUnlinkRecipes(firestore, user.uid, id, true, linkedRecipeIds);
      toast({ title: 'Carpeta global eliminada' });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo eliminar la carpeta global.' });
    }
  }, [user, firestore, globalRecipes, toast]);
  
  const handleGlobalFolderUpdate = useCallback(async (id: string, name: string) => {
    if (!user || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'nutriplanner_folders', id), { name });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo actualizar la carpeta global.' });
    }
  }, [user, firestore, toast]);

  const handleAssignRecipeToGlobalFolder = useCallback(async (recipeId: string, folderId: string | null) => {
    if (!user || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'nutriplanner_recipes', recipeId), { folderId });
      toast({ title: 'Receta movida' });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: 'No se pudo mover la receta.' });
    }
  }, [user, firestore, toast]);

  return {
    isSaving,
    currentUserRecipes,
    nutriplannerRecipes,
    currentFolders,
    globalFolders: currentGlobalFolders,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleCopyRecipe,
    handleFolderCreate,
    handleFolderDelete,
    handleFolderUpdate,
    handleAssignRecipeToFolder,
    handleGlobalFolderCreate,
    handleGlobalFolderDelete,
    handleGlobalFolderUpdate,
    handleAssignRecipeToGlobalFolder,
  };
}
