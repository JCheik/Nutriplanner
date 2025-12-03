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
import type { Recipe, Folder } from '@/lib/types';


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

  // --- Memoized Data Sources ---
  const currentUserRecipes = useMemo(() => userRecipes || [], [userRecipes]);
  const currentFolders = useMemo(() => folders || [], [folders]);
  
  // --- Handlers ---
  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
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
    if (!user || !firestore || !userRecipesCollectionRef) return;
    
    deleteDocumentNonBlocking(doc(userRecipesCollectionRef, recipeId));

    toast({ title: 'Receta eliminada', description: 'La receta se ha eliminado de tu librería.' });

  }, [user, firestore, userRecipesCollectionRef, toast]);


  const handleCopyRecipe = useCallback((recipe: Recipe) => {
    if (!user || !userRecipesCollectionRef) return;
    
    const { id, folderId, ...recipeData } = recipe; // Exclude original ID and folder
    const newRecipeRef = doc(userRecipesCollectionRef); // Let Firestore generate ID
    addDocumentNonBlocking(userRecipesCollectionRef, { ...recipeData, id: newRecipeRef.id, folderId: null });

    toast({ title: '¡Receta Copiada!', description: `${recipe.name} ha sido añadida a "Mis Recetas".` });
  }, [user, userRecipesCollectionRef, toast]);


  const handleFolderCreate = useCallback((name: string) => {
    if (!user || !foldersCollectionRef) return;
    addDocumentNonBlocking(foldersCollectionRef, { name, userId: user.uid });
    toast({ title: 'Carpeta creada', description: `La carpeta "${name}" ha sido creada.` });
  }, [user, foldersCollectionRef, toast]);

  const handleFolderDelete = useCallback(async (id: string) => {
    if (!user || !firestore) return;
    
    deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'folders', id));

    const batch = writeBatch(firestore);
    (userRecipes?.filter(r => r.folderId === id) || []).forEach(recipe => {
      batch.update(doc(firestore, 'users', user.uid, 'recipes', recipe.id), { folderId: null });
    });
    
    await batch.commit();
    toast({ title: 'Carpeta eliminada' });
  }, [user, firestore, userRecipes, toast]);
  
  const handleFolderUpdate = useCallback((id: string, name: string) => {
    if (!user || !firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'folders', id), { name });
  }, [user, firestore]);

  const handleAssignRecipeToFolder = useCallback((recipeId: string, folderId: string | null) => {
    if (!user || !firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'recipes', recipeId), { folderId });
    toast({ title: 'Receta movida' });
  }, [user, firestore, toast]);

  return {
    isSaving,
    currentUserRecipes,
    nutriplannerRecipes: [], // This is static global data
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
