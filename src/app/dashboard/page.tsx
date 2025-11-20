'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { DayPlan, Recipe, Meal, WeekPlan, DialogState, UserProfile, CalculationResult, GoalType, ActiveDropTarget, RecipeInstance, Folder, GlobalFolder } from '@/lib/types';
import { INITIAL_WEEK_PLAN, INITIAL_RECIPES } from '@/lib/data';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { StickyNote } from '@/components/nutri-planner/sticky-note';
import { FloatingGoals } from '@/components/nutri-planner/floating-goals';
import { ShoppingListSheet } from '@/components/nutri-planner/shopping-list';
import { FloatingMenu } from '@/components/nutri-planner/floating-menu';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirebase, useFirestore, useMemoFirebase } from '@/firebase/index';
import { collection, doc, writeBatch } from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { uploadImageAndGetUrl } from '@/firebase/storage/image-upload';
import { Logo } from '@/components/icons/logo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface DashboardProps {
  isGuestMode?: boolean;
  onExitGuestMode?: () => void;
}

// --- Helper functions to update week plan state ---

const addRecipeToMeal = (plan: WeekPlan, day: string, mealId: string, recipe: Recipe): WeekPlan => {
    const newRecipeInstance: RecipeInstance = {
        ...recipe,
        instanceId: self.crypto.randomUUID()
    };
    return plan.map(dayPlan =>
        dayPlan.day === day
            ? {
                ...dayPlan,
                meals: dayPlan.meals.map(meal =>
                    meal.id === mealId
                        ? { ...meal, recipes: [...meal.recipes, newRecipeInstance] }
                        : meal
                )
            }
            : dayPlan
    );
};

const clearMealRecipes = (plan: WeekPlan, day: string, mealId: string): WeekPlan => {
    return plan.map(dayPlan =>
        dayPlan.day === day
            ? {
                ...dayPlan,
                meals: dayPlan.meals.map(meal =>
                    meal.id === mealId ? { ...meal, recipes: [] } : meal
                )
            }
            : dayPlan
    );
};

const removeRecipeFromMeal = (plan: WeekPlan, day: string, mealId: string, recipeInstanceId: string): WeekPlan => {
    return plan.map(dayPlan =>
        dayPlan.day === day
            ? {
                ...dayPlan,
                meals: dayPlan.meals.map(meal => {
                    if (meal.id !== mealId) return meal;
                    const updatedRecipes = meal.recipes.filter(r => r.instanceId !== recipeInstanceId);
                    return { ...meal, recipes: updatedRecipes };
                })
            }
            : dayPlan
    );
};


export default function Dashboard({ isGuestMode = false, onExitGuestMode }: DashboardProps) {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const { firestore, storage } = useFirebase();

  // State for guest mode
  const [guestRecipes, setGuestRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [guestWeekPlan, setGuestWeekPlan] = useState<WeekPlan>(INITIAL_WEEK_PLAN);
  const [guestStickyNote, setGuestStickyNote] = useState('¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.');
  const [guestCalorieResult, setGuestCalorieResult] = useState<CalculationResult | null>(null);

  // Firestore data hooks for logged-in users
  const userRecipesCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: userRecipes, isLoading: userRecipesLoading } = useCollection<Recipe>(userRecipesCollectionRef);

  const foldersCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'folders') : null, [firestore, user]);
  const { data: folders, isLoading: foldersLoading } = useCollection<Folder>(foldersCollectionRef);

  const globalFoldersCollectionRef = useMemoFirebase(() => (firestore) ? collection(firestore, 'nutriplanner_folders') : null, [firestore]);
  const { data: globalFolders, isLoading: globalFoldersLoading } = useCollection<GlobalFolder>(globalFoldersCollectionRef);

  const nutriplannerRecipesCollectionRef = useMemoFirebase(() => (firestore && !isGuestMode) ? collection(firestore, 'nutriplanner_recipes') : null, [firestore, isGuestMode]);
  const { data: nutriplannerRecipes, isLoading: nutriplannerRecipesLoading } = useCollection<Recipe>(nutriplannerRecipesCollectionRef);

  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);
  
  const userProfileRef = useMemoFirebase(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
  
  // Dialog and UI state
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [activePanel, setActivePanel] = useState<'goals' | 'shopping-list' | 'sticky-note' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGuestPromptOpen, setIsGuestPromptOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<GoalType>('maintenance');
  const [activeDropTarget, setActiveDropTarget] = useState<ActiveDropTarget | null>(null);

  useEffect(() => {
    if (userProfile?.activeGoalPreference) {
      setActiveGoal(userProfile.activeGoalPreference);
    } else {
      setActiveGoal('maintenance');
    }
  }, [userProfile]);

  const handleActiveGoalChange = (goal: GoalType) => {
    setActiveGoal(goal);
    if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { activeGoalPreference: goal });
    }
  };

  // Memoized data sources based on auth state
  const currentUserRecipes = useMemo(() => isGuestMode ? guestRecipes : (userRecipes || []), [isGuestMode, guestRecipes, userRecipes]);
  const currentFolders = useMemo(() => isGuestMode ? [] : (folders || []), [isGuestMode, folders]);
  const currentGlobalFolders = useMemo(() => globalFolders || [], [globalFolders]);
  const currentNutriplannerRecipes = useMemo(() => nutriplannerRecipes || [], [nutriplannerRecipes]);
  
  const currentWeekPlan = useMemo(() => {
    if (isGuestMode) return guestWeekPlan;

    if (!weekPlanData || weekPlanData.length === 0) {
      return INITIAL_WEEK_PLAN;
    }
    
    const planMap = new Map(weekPlanData.map(day => [day.day, day]));

    if (planMap.size === 0) {
      return INITIAL_WEEK_PLAN;
    }

    return DAY_ORDER.map(dayName => {
        const savedDay = planMap.get(dayName as DayPlan['day']);
        if (savedDay) {
          const meals = Array.isArray(savedDay.meals) ? savedDay.meals : [];
          return { ...savedDay, day: dayName as DayPlan['day'], meals };
        }
        return INITIAL_WEEK_PLAN.find(d => d.day === dayName)!;
    });

  }, [isGuestMode, guestWeekPlan, weekPlanData]);

  const currentStickyNote = useMemo(() => isGuestMode ? guestStickyNote : (userProfile?.stickyNote || '¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.'), [isGuestMode, guestStickyNote, userProfile]);
  const currentCalorieResult = useMemo(() => isGuestMode ? guestCalorieResult : (userProfile?.calorieResult || null), [isGuestMode, guestCalorieResult, userProfile]);
  
  // --- Guest Mode Interaction ---
  const promptToRegister = () => {
    if (isGuestMode) {
      setIsGuestPromptOpen(true);
      return true; // Indicates that the prompt was shown
    }
    return false; // Indicates that the user is logged in
  };

  const updateDayPlanInFirestore = (day: string, updatedMeals: Meal[]) => {
    if (!user || !firestore) return;
    const targetDay = currentWeekPlan.find(d => d.day === day);
    if (targetDay) {
        const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
        setDocumentNonBlocking(dayDocRef, { ...targetDay, meals: updatedMeals }, { merge: true });
    }
  };

  const handleDrop = useCallback((day: string, mealId: string, droppedRecipe: Recipe) => {
    if (isGuestMode) {
        setGuestWeekPlan(plan => addRecipeToMeal(plan, day, mealId, droppedRecipe));
    } else {
        const updatedPlan = addRecipeToMeal(currentWeekPlan, day, mealId, droppedRecipe);
        const updatedDay = updatedPlan.find(d => d.day === day);
        if (updatedDay) {
            updateDayPlanInFirestore(day, updatedDay.meals);
        }
    }
    setActiveDropTarget(null);
  }, [user, firestore, currentWeekPlan, isGuestMode]);
  
  const handleClearMeal = useCallback((day: string, mealId: string) => {
    if (isGuestMode) {
        setGuestWeekPlan(plan => clearMealRecipes(plan, day, mealId));
    } else {
        const updatedPlan = clearMealRecipes(currentWeekPlan, day, mealId);
        const updatedDay = updatedPlan.find(d => d.day === day);
        if (updatedDay) {
            updateDayPlanInFirestore(day, updatedDay.meals);
        }
    }
  }, [user, firestore, currentWeekPlan, isGuestMode]);
  
  const handleRemoveRecipeFromMeal = useCallback((day: string, mealId: string, recipeInstanceId: string) => {
    if (isGuestMode) {
        setGuestWeekPlan(plan => removeRecipeFromMeal(plan, day, mealId, recipeInstanceId));
    } else {
        const updatedPlan = removeRecipeFromMeal(currentWeekPlan, day, mealId, recipeInstanceId);
        const updatedDay = updatedPlan.find(d => d.day === day);
        if (updatedDay) {
            updateDayPlanInFirestore(day, updatedDay.meals);
        }
    }
  }, [user, firestore, currentWeekPlan, isGuestMode]);

  const handleUpdateMealTitle = useCallback((day: string, mealId: string, newTitle: string) => {
      if (promptToRegister()) return;
      if (!user || !firestore || !currentWeekPlan) return;

      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
      const targetDay = currentWeekPlan.find(d => d.day === day);

      if (targetDay) {
          const updatedMeals = targetDay.meals.map(meal =>
              meal.id === mealId ? { ...meal, title: newTitle } : meal
          );
          const updatedDayPlan = { ...targetDay, meals: updatedMeals };
          setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
      }
  }, [user, firestore, currentWeekPlan, isGuestMode]);

  const handleAddMeal = useCallback((day: string, index: number) => {
    if (promptToRegister()) return;
    if (!user || !firestore || !currentWeekPlan) return;

    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    const targetDay = currentWeekPlan.find(d => d.day === day);

    if (targetDay) {
        const newMeal: Meal = {
            id: `meal-${Date.now()}-${day}`,
            title: 'Nueva Comida',
            recipes: [],
        };
        const updatedMeals = [...targetDay.meals];
        updatedMeals.splice(index, 0, newMeal);
        
        const updatedDayPlan = { ...targetDay, meals: updatedMeals };
        setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
    }
  }, [user, firestore, currentWeekPlan, isGuestMode]);

  const handleDeleteMeal = useCallback((day: string, mealId: string) => {
      if (promptToRegister()) return;
      if (!user || !firestore || !currentWeekPlan) return;

      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
      const targetDay = currentWeekPlan.find(d => d.day === day);

      if (targetDay) {
          const updatedMeals = targetDay.meals.filter(meal => meal.id !== mealId);
          const updatedDayPlan = { ...targetDay, meals: updatedMeals };
          setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
      }
  }, [user, firestore, currentWeekPlan, isGuestMode]);

  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe: boolean = false) => {
    if ((action === 'create' || action === 'edit') && promptToRegister()) {
        return;
    }
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe || undefined,
      isNutriPlannerRecipe,
    });
  }, [isGuestMode]);
  
  const handleAddToPlan = (recipe: Recipe) => {
    if (activeDropTarget) {
      handleDrop(activeDropTarget.day, activeDropTarget.mealId, recipe);
    } else {
      toast({
        variant: "destructive",
        title: "Selecciona un destino",
        description: "Toca una casilla de comida en el planificador antes de añadir una receta.",
      });
    }
  };

  const handleDialogClose = useCallback(() => {
    setDialogState({ open: false });
  }, []);

  const handleSaveRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
    if (promptToRegister()) return;
    if (!user || !firestore || !storage) return;

    setIsSaving(true);
    
    try {
        const targetCollectionRef = isGlobal ? nutriplannerRecipesCollectionRef : userRecipesCollectionRef;
        if (!targetCollectionRef) throw new Error("Colección de destino no encontrada.");

        const recipeId = existingId || doc(targetCollectionRef).id;
        let finalImageUrl = (existingId && (isGlobal ? currentNutriplannerRecipes : currentUserRecipes).find(r => r.id === existingId)?.imageUrl) || '';

        if (imageFile) {
          try {
            finalImageUrl = await uploadImageAndGetUrl(storage, imageFile, recipeId);
          } catch(uploadError) {
             console.error("Error al subir la imagen:", uploadError);
             toast({ variant: "destructive", title: "¡Oh no! Error de subida.", description: "No se pudo subir la imagen. Por favor, inténtalo de nuevo." });
             setIsSaving(false);
             return;
          }
        }
        
        const recipeData: Recipe = {
          ...recipe,
          id: recipeId,
          imageUrl: finalImageUrl
        };
        
        // Firestore doesn't allow 'undefined' values.
        if (!recipeData.folderId) {
            delete (recipeData as Partial<Recipe>).folderId;
        }

        const recipeRef = doc(targetCollectionRef, recipeId);
        await setDocumentNonBlocking(recipeRef, recipeData, { merge: true });
        
        const isExistingRecipe = !!existingId;
        toast({ title: isExistingRecipe ? '¡Receta actualizada!' : '¡Receta guardada!', description: `${recipeData.name} se ha ${isExistingRecipe ? 'actualizado' : 'guardado'}.` });
        handleDialogClose();

    } catch (error) {
        console.error("Error al guardar la receta:", error);
        toast({ variant: "destructive", title: "¡Oh no! Algo salió mal.", description: (error as Error).message || "No se pudo guardar la receta." });
    } finally {
        setIsSaving(false);
    }
}, [user, firestore, storage, nutriplannerRecipesCollectionRef, userRecipesCollectionRef, currentNutriplannerRecipes, currentUserRecipes, toast, handleDialogClose, isGuestMode]);


  const handleDeleteRecipe = useCallback(async (recipeId: string, isGlobal: boolean) => {
    if (promptToRegister()) return;
    if (!user || !firestore) return;
    
    const targetCollectionRef = isGlobal ? nutriplannerRecipesCollectionRef : userRecipesCollectionRef;
    if (!targetCollectionRef) return;

    const recipeRef = doc(targetCollectionRef, recipeId);
    deleteDocumentNonBlocking(recipeRef);

    // If a user recipe is deleted, also remove all its instances from the week plan
    if (!isGlobal) {
        try {
            const batch = writeBatch(firestore);
            currentWeekPlan.forEach(dayPlan => {
                let dayWasUpdated = false;
                const newMeals = dayPlan.meals.map(meal => {
                    const initialLength = meal.recipes.length;
                    const filteredRecipes = meal.recipes.filter(r => r.id !== recipeId);
                    if (initialLength > filteredRecipes.length) {
                        dayWasUpdated = true;
                        return { ...meal, recipes: filteredRecipes };
                    }
                    return meal;
                });
                if (dayWasUpdated) {
                    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', dayPlan.day);
                    batch.set(dayDocRef, { meals: newMeals }, { merge: true });
                }
            });
            await batch.commit();
        } catch (error) {
            console.error("Error removing recipe from week plan:", error);
        }
    }

    toast({ title: 'Receta eliminada', description: 'La receta ha sido eliminada permanentemente.' });
    handleDialogClose();
  }, [handleDialogClose, user, firestore, userRecipesCollectionRef, nutriplannerRecipesCollectionRef, currentWeekPlan, toast, isGuestMode]);

  const handleCopyRecipe = useCallback((recipe: Recipe) => {
    if (promptToRegister()) return;
    if (!user || !userRecipesCollectionRef) return;
    
    const { id, ...recipeData } = recipe;
    
    const newRecipeRef = doc(userRecipesCollectionRef);
    addDocumentNonBlocking(userRecipesCollectionRef, { ...recipeData, id: newRecipeRef.id });

    toast({ title: '¡Receta Copiada!', description: `${recipe.name} ha sido añadida a "Mis Recetas".` });
  }, [user, userRecipesCollectionRef, toast, isGuestMode]);

  // --- Folder Actions ---
  const handleFolderCreate = useCallback((name: string) => {
    if (promptToRegister() || !user || !foldersCollectionRef) return;
    const newFolder: Omit<Folder, 'id'> = { name, userId: user.uid };
    addDocumentNonBlocking(foldersCollectionRef, newFolder);
    toast({ title: 'Carpeta creada', description: `La carpeta "${name}" ha sido creada.` });
  }, [user, foldersCollectionRef, isGuestMode]);

  const handleFolderDelete = useCallback(async (id: string) => {
    if (promptToRegister() || !user || !firestore) return;
    
    const folderRef = doc(firestore, 'users', user.uid, 'folders', id);
    deleteDocumentNonBlocking(folderRef);

    // Unassign recipes from the deleted folder
    const batch = writeBatch(firestore);
    const recipesToUpdate = userRecipes?.filter(r => r.folderId === id) || [];
    recipesToUpdate.forEach(recipe => {
      const recipeRef = doc(firestore, 'users', user.uid, 'recipes', recipe.id);
      batch.update(recipeRef, { folderId: null });
    });
    
    await batch.commit();
    toast({ title: 'Carpeta eliminada' });
  }, [user, firestore, userRecipes, isGuestMode]);
  
  const handleFolderUpdate = useCallback((id: string, name: string) => {
    if (promptToRegister() || !user || !firestore) return;
    const folderRef = doc(firestore, 'users', user.uid, 'folders', id);
    updateDocumentNonBlocking(folderRef, { name });
  }, [user, firestore, isGuestMode]);

  const handleAssignRecipeToFolder = useCallback((recipeId: string, folderId: string | null) => {
    if (promptToRegister() || !user || !firestore) return;
    const recipeRef = doc(firestore, 'users', user.uid, 'recipes', recipeId);
    updateDocumentNonBlocking(recipeRef, { folderId });
    toast({ title: 'Receta movida' });
  }, [user, firestore, isGuestMode]);

  // --- Global Folder Actions (Admin only) ---
  const handleGlobalFolderCreate = useCallback((name: string) => {
    if (!globalFoldersCollectionRef) return;
    const newFolder: Omit<GlobalFolder, 'id'> = { name };
    addDocumentNonBlocking(globalFoldersCollectionRef, newFolder);
    toast({ title: 'Carpeta global creada', description: `La carpeta "${name}" ha sido creada.` });
  }, [globalFoldersCollectionRef]);

  const handleGlobalFolderDelete = useCallback(async (id: string) => {
    if (!firestore || !globalFoldersCollectionRef) return;
    
    const folderRef = doc(firestore, 'nutriplanner_folders', id);
    deleteDocumentNonBlocking(folderRef);

    const batch = writeBatch(firestore);
    const recipesToUpdate = nutriplannerRecipes?.filter(r => r.folderId === id) || [];
    recipesToUpdate.forEach(recipe => {
      const recipeRef = doc(firestore, 'nutriplanner_recipes', recipe.id);
      batch.update(recipeRef, { folderId: null });
    });
    
    await batch.commit();
    toast({ title: 'Carpeta global eliminada' });
  }, [firestore, nutriplannerRecipes]);

  const handleGlobalFolderUpdate = useCallback((id: string, name: string) => {
    if (!firestore) return;
    const folderRef = doc(firestore, 'nutriplanner_folders', id);
    updateDocumentNonBlocking(folderRef, { name });
  }, [firestore]);

  const handleAssignRecipeToGlobalFolder = useCallback((recipeId: string, folderId: string | null) => {
    if (!firestore) return;
    const recipeRef = doc(firestore, 'nutriplanner_recipes', recipeId);
    updateDocumentNonBlocking(recipeRef, { folderId });
    toast({ title: 'Receta movida' });
  }, [firestore]);


  const dailyTotals = useMemo(() => {
    return currentWeekPlan.map(dayPlan => {
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      if (Array.isArray(dayPlan.meals)) {
        dayPlan.meals.forEach(meal => {
          meal.recipes.forEach(recipe => {
            totals.calories += recipe.calories;
            totals.protein += recipe.protein;
            totals.carbs += recipe.carbs;
            totals.fat += recipe.fat;
          });
        });
      }
      return { day: dayPlan.day, totals };
    });
  }, [currentWeekPlan]);
  
  const handleNoteSave = useCallback((content: string) => {
    if (isGuestMode) {
      setGuestStickyNote(content);
    } else if (user && userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { stickyNote: content });
    }
  }, [user, userProfileRef, isGuestMode]);

  const handleCalorieResultSave = useCallback((result: CalculationResult) => {
    if (isGuestMode) {
        setGuestCalorieResult(result);
    } else if (user && userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { calorieResult: result });
    }
  }, [user, userProfileRef, isGuestMode]);

  const handlePanelOpen = (panel: 'goals' | 'shopping-list' | 'sticky-note') => {
    setActivePanel(panel);
  }
  
  const handlePanelChange = (panel: 'goals' | 'shopping-list' | 'sticky-note', isOpen: boolean) => {
    if (!isOpen) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
    }
  }

  const isLoading = !isGuestMode && (userLoading || userRecipesLoading || nutriplannerRecipesLoading || weekPlanLoading || profileLoading || foldersLoading || globalFoldersLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu planificador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-foreground">
      <PageHeader isGuest={isGuestMode} onRegisterClick={onExitGuestMode} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-6">
          <div className="w-full">
            <MealPlanner
              weekPlan={currentWeekPlan}
              dailyTotals={dailyTotals}
              activeGoal={currentCalorieResult && activeGoal ? currentCalorieResult[activeGoal] : null}
              onDrop={handleDrop}
              onClearMeal={handleClearMeal}
              onRecipeClick={(recipe) => handleRecipeAction('view', recipe)}
              onRemoveRecipeFromMeal={handleRemoveRecipeFromMeal}
              onUpdateMealTitle={handleUpdateMealTitle}
              onAddMeal={handleAddMeal}
              onDeleteMeal={handleDeleteMeal}
              activeDropTarget={activeDropTarget}
              onSetDropTarget={setActiveDropTarget}
            />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <RecipeLibrary 
              userRecipes={currentUserRecipes}
              nutriplannerRecipes={currentNutriplannerRecipes}
              folders={currentFolders}
              globalFolders={currentGlobalFolders}
              onRecipeAction={handleRecipeAction}
              onCopyRecipe={handleCopyRecipe}
              onAddToPlan={handleAddToPlan}
              onFolderCreate={handleFolderCreate}
              onFolderUpdate={handleFolderUpdate}
              onFolderDelete={handleFolderDelete}
              onAssignRecipeToFolder={handleAssignRecipeToFolder}
              onGlobalFolderCreate={handleGlobalFolderCreate}
              onGlobalFolderUpdate={handleGlobalFolderUpdate}
              onGlobalFolderDelete={handleGlobalFolderDelete}
              onAssignRecipeToGlobalFolder={handleAssignRecipeToGlobalFolder}
            />
          </div>
        </div>
      </main>
      <RecipeDialog
        dialogState={dialogState}
        isSaving={isSaving}
        folders={currentFolders}
        globalFolders={currentGlobalFolders}
        onClose={handleDialogClose}
        onSave={handleSaveRecipe}
        onDelete={handleDeleteRecipe}
        onEdit={(recipe, isGlobal) => handleRecipeAction('edit', recipe, isGlobal)}
        onCopy={handleCopyRecipe}
      />
      
      <FloatingMenu onPanelOpen={handlePanelOpen} />

      <ShoppingListSheet
        weekPlan={currentWeekPlan}
        isOpen={activePanel === 'shopping-list'}
        onOpenChange={(isOpen) => handlePanelChange('shopping-list', isOpen)}
      />
      <FloatingGoals
        calorieResult={currentCalorieResult}
        onCalorieResultSave={handleCalorieResultSave}
        isOpen={activePanel === 'goals'}
        onOpenChange={(isOpen) => handlePanelChange('goals', isOpen)}
        onGoalSelect={handleActiveGoalChange}
        activeGoal={activeGoal}
      />
      <StickyNote
        initialContent={currentStickyNote}
        onSave={handleNoteSave}
        isOpen={activePanel === 'sticky-note'}
        onOpenChange={(isOpen) => handlePanelChange('sticky-note', isOpen)}
      />

       <AlertDialog open={isGuestPromptOpen} onOpenChange={setIsGuestPromptOpen}>
        <AlertDialogContent className="bg-glass">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quieres guardar tus cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás en modo invitado. Para guardar tus recetas y planes de comidas, necesitas iniciar sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsGuestPromptOpen(false)}>Seguir como invitado</AlertDialogCancel>
            <AlertDialogAction onClick={onExitGuestMode}>
              Ir a la página de registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
