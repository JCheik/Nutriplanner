'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUser, useCollection, useDoc, useFirebase, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { saveRecipe as saveRecipeAction } from '@/lib/actions';
import { NUTRIPLANNER_RECIPES_DATA, INITIAL_WEEK_PLAN, DAY_ORDER } from '@/lib/data';
import type { WeekPlan, Recipe, Meal, DayPlan, UserProfile, CalculationResult, GoalType, RecipeInstance, Folder, ShoppingListItem } from '@/lib/types';

// --- Helper Functions ---

const addRecipeToMeal = (plan: WeekPlan, day: string, mealId: string, recipe: Recipe): WeekPlan => {
    const newRecipeInstance: RecipeInstance = { ...recipe, instanceId: self.crypto.randomUUID() };
    return plan.map(dayPlan =>
        dayPlan.day === day
            ? { ...dayPlan, meals: dayPlan.meals.map(meal => meal.id === mealId ? { ...meal, recipes: [...meal.recipes, newRecipeInstance] } : meal) }
            : dayPlan
    );
};

const clearMealRecipes = (plan: WeekPlan, day: string, mealId: string): WeekPlan => {
    return plan.map(dayPlan =>
        dayPlan.day === day
            ? { ...dayPlan, meals: dayPlan.meals.map(meal => meal.id === mealId ? { ...meal, recipes: [] } : meal) }
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


export function usePlannerState({ isGuestMode = false } = {}) {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const { firestore } = useFirebase();

  // --- Guest State ---
  const [guestRecipes, setGuestRecipes] = useState<Recipe[]>(NUTRIPLANNER_RECIPES_DATA);
  const [guestWeekPlan, setGuestWeekPlan] = useState<WeekPlan>(INITIAL_WEEK_PLAN);
  const [guestStickyNote, setGuestStickyNote] = useState('¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.');
  const [guestCalorieResult, setGuestCalorieResult] = useState<CalculationResult | null>(null);
  const [guestShoppingList, setGuestShoppingList] = useState<ShoppingListItem[]>([]);


  // --- Firestore Data ---
  const userProfileRef = useMemoFirebase(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const userRecipesCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: userRecipes, isLoading: userRecipesLoading } = useCollection<Recipe>(userRecipesCollectionRef);

  const foldersCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'folders') : null, [firestore, user]);
  const { data: folders, isLoading: foldersLoading } = useCollection<Folder>(foldersCollectionRef);

  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);
  

  // --- UI State ---
  const [isSaving, setIsSaving] = useState(false);
  const [activeGoal, setActiveGoal] = useState<GoalType>('maintenance');

   useEffect(() => {
    if (!isGuestMode && userProfile?.activeGoalPreference) {
      setActiveGoal(userProfile.activeGoalPreference);
    } else {
      setActiveGoal('maintenance');
    }
  }, [userProfile, isGuestMode]);

  // --- Memoized Data Sources ---
  const currentUserRecipes = useMemo(() => isGuestMode ? guestRecipes : (userRecipes || []), [isGuestMode, guestRecipes, userRecipes]);
  const currentFolders = useMemo(() => isGuestMode ? [] : (folders || []), [isGuestMode, folders]);
  
  const currentWeekPlan = useMemo(() => {
    if (isGuestMode) return guestWeekPlan;
    if (weekPlanData === null || weekPlanData.length === 0) return INITIAL_WEEK_PLAN;
    
    const planMap = new Map(weekPlanData.map(day => [day.day, day]));

    return DAY_ORDER.map(dayName => {
        const savedDay = planMap.get(dayName as DayPlan['day']);
        const initialDay = INITIAL_WEEK_PLAN.find(d => d.day === dayName)!;
        if (savedDay) {
          // Ensure meals exist and have unique IDs
          const meals = Array.isArray(savedDay.meals) ? savedDay.meals : [];
          return { ...initialDay, ...savedDay, day: dayName as DayPlan['day'], meals };
        }
        return initialDay;
    });
  }, [isGuestMode, guestWeekPlan, weekPlanData]);
  
  const currentStickyNote = useMemo(() => isGuestMode ? guestStickyNote : (userProfile?.stickyNote || ''), [isGuestMode, guestStickyNote, userProfile]);
  const currentCalorieResult = useMemo(() => isGuestMode ? guestCalorieResult : (userProfile?.calorieResult || null), [isGuestMode, guestCalorieResult, userProfile]);
  const activeGoalMacros = useMemo(() => currentCalorieResult && activeGoal ? currentCalorieResult[activeGoal] : null, [currentCalorieResult, activeGoal]);
  const currentShoppingList = useMemo(() => isGuestMode ? guestShoppingList : (userProfile?.shoppingList || []), [isGuestMode, guestShoppingList, userProfile]);

  const isLoading = !isGuestMode && (userLoading || userRecipesLoading || weekPlanLoading || profileLoading || foldersLoading);

  // --- Helper for Firestore Day Updates ---
  const updateDayPlanInFirestore = (day: string, updatedDayData: DayPlan) => {
    if (isGuestMode || !user || !firestore) return;
    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    setDocumentNonBlocking(dayDocRef, updatedDayData, { merge: true });
  };

  // --- Handlers ---
  const handleDrop = useCallback((day: string, mealId: string, droppedRecipe: Recipe) => {
    const planToUpdate = currentWeekPlan;
    const updatedPlan = addRecipeToMeal(planToUpdate, day, mealId, droppedRecipe);
    const updatedDay = updatedPlan.find(d => d.day === day);

    if (isGuestMode) {
        setGuestWeekPlan(updatedPlan);
    } else if (updatedDay) {
        updateDayPlanInFirestore(day, updatedDay);
    }
  }, [isGuestMode, currentWeekPlan, updateDayPlanInFirestore]);
  
  const handleClearMeal = useCallback((day: string, mealId: string) => {
    const updatedPlan = clearMealRecipes(currentWeekPlan, day, mealId);
    const updatedDay = updatedPlan.find(d => d.day === day);
     if (isGuestMode) {
        setGuestWeekPlan(updatedPlan);
    } else if (updatedDay) {
        updateDayPlanInFirestore(day, updatedDay);
    }
  }, [isGuestMode, currentWeekPlan, updateDayPlanInFirestore]);
  
  const handleRemoveRecipeFromMeal = useCallback((day: string, mealId: string, recipeInstanceId: string) => {
    const updatedPlan = removeRecipeFromMeal(currentWeekPlan, day, mealId, recipeInstanceId);
    const updatedDay = updatedPlan.find(d => d.day === day);
     if (isGuestMode) {
        setGuestWeekPlan(updatedPlan);
    } else if (updatedDay) {
        updateDayPlanInFirestore(day, updatedDay);
    }
  }, [isGuestMode, currentWeekPlan, updateDayPlanInFirestore]);

  const handleUpdateMealTitle = useCallback((day: string, mealId: string, newTitle: string) => {
      if (isGuestMode || !user || !firestore) return;
      const targetDay = currentWeekPlan.find(d => d.day === day);
      if (targetDay) {
          const updatedMeals = targetDay.meals.map(meal => meal.id === mealId ? { ...meal, title: newTitle } : meal);
          updateDayPlanInFirestore(day, {...targetDay, meals: updatedMeals});
      }
  }, [user, firestore, currentWeekPlan, isGuestMode, updateDayPlanInFirestore]);

  const handleAddMeal = useCallback((day: string, index: number) => {
    if (isGuestMode || !user || !firestore) return;
    const targetDay = currentWeekPlan.find(d => d.day === day);
    if (targetDay) {
        const newMeal: Meal = { id: `meal-${self.crypto.randomUUID()}`, title: 'Nueva Comida', recipes: [] };
        const updatedMeals = [...targetDay.meals];
        updatedMeals.splice(index, 0, newMeal);
        updateDayPlanInFirestore(day, {...targetDay, meals: updatedMeals});
    }
  }, [user, firestore, currentWeekPlan, isGuestMode, updateDayPlanInFirestore]);

  const handleDeleteMeal = useCallback((day: string, mealId: string) => {
      if (isGuestMode || !user || !firestore) return;
      const targetDay = currentWeekPlan.find(d => d.day === day);
      if (targetDay) {
          const updatedMeals = targetDay.meals.filter(meal => meal.id !== mealId);
          updateDayPlanInFirestore(day, {...targetDay, meals: updatedMeals});
      }
  }, [user, firestore, currentWeekPlan, isGuestMode, updateDayPlanInFirestore]);

  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
    if (isGuestMode) {
        const newRecipe = { ...recipeData, id: existingId || self.crypto.randomUUID() };
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
    
    deleteDocumentNonBlocking(doc(userRecipesCollectionRef, recipeId));

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
            batch.set(doc(firestore, 'users', user.uid, 'weekPlan', dayPlan.day), { meals: newMeals }, { merge: true });
        }
    });
    await batch.commit();

    toast({ title: 'Receta eliminada' });
  }, [user, firestore, userRecipesCollectionRef, currentWeekPlan, toast, isGuestMode, guestRecipes]);

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

  const handleNoteSave = useCallback((content: string) => {
    if (isGuestMode) {
      setGuestStickyNote(content);
    } else if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { stickyNote: content });
    }
  }, [userProfileRef, isGuestMode]);

  const handleCalorieResultSave = useCallback((result: CalculationResult) => {
    if (isGuestMode) {
        setGuestCalorieResult(result);
    } else if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { calorieResult: result });
    }
  }, [userProfileRef, isGuestMode]);

  const handleActiveGoalChange = (goal: GoalType) => {
    setActiveGoal(goal);
    if (!isGuestMode && userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { activeGoalPreference: goal });
    }
  };

  const handleSaveCustomGoal = (macros: GoalMacros) => {
        const newResult: CalculationResult = {
            bmr: currentCalorieResult?.bmr || 0,
            maintenance: currentCalorieResult?.maintenance || { calories: 0, protein: 0, carbs: 0, fat: 0 },
            loss: currentCalorieResult?.loss || { calories: 0, protein: 0, carbs: 0, fat: 0 },
            gain: currentCalorieResult?.gain || { calories: 0, protein: 0, carbs: 0, fat: 0 },
            custom: macros,
        };
        handleCalorieResultSave(newResult);
    };
  
  const handleShoppingListUpdate = useCallback((list: ShoppingListItem[]) => {
      if (isGuestMode) {
        setGuestShoppingList(list);
      } else if (userProfileRef) {
        updateDocumentNonBlocking(userProfileRef, { shoppingList: list });
      }
  }, [userProfileRef, isGuestMode]);

  return {
    // Core Data
    user,
    currentUserRecipes,
    nutriplannerRecipes: NUTRIPLANNER_RECIPES_DATA,
    currentFolders,
    currentWeekPlan,
    currentStickyNote,
    currentCalorieResult,
    activeGoalMacros,
    currentShoppingList,
    
    // UI State
    isLoading,
    isSaving,
    activeGoal,
    isGuestMode,

    // Callbacks & Handlers
    setGuestWeekPlan, // Exposed for specific guest-mode updates if needed
    handleDrop,
    handleClearMeal,
    handleRemoveRecipeFromMeal,
    handleUpdateMealTitle,
    handleAddMeal,
    handleDeleteMeal,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleCopyRecipe,
    handleFolderCreate,
    handleFolderDelete,
    handleFolderUpdate,
    handleAssignRecipeToFolder,
    handleNoteSave,
    handleCalorieResultSave,
    handleActiveGoalChange,
    handleSaveCustomGoal,
    handleShoppingListUpdate
  };
}
