'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { DayPlan, Recipe, WeekPlan, MealType, DialogState, SortCriteria, UserProfile, CalculationResult } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { StickyNote } from '@/components/nutri-planner/sticky-note';
import { FloatingGoals } from '@/components/nutri-planner/floating-goals';
import { ShoppingListSheet } from '@/components/nutri-planner/shopping-list';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Logo } from '@/components/icons/logo';
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Dashboard() {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const userRecipesCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: userRecipes, isLoading: userRecipesLoading } = useCollection<Recipe>(userRecipesCollectionRef);

  const nutriplannerRecipesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'nutriplanner_recipes') : null, [firestore]);
  const { data: nutriplannerRecipes, isLoading: nutriplannerRecipesLoading } = useCollection<Recipe>(nutriplannerRecipesCollectionRef);

  const weekPlanCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);
  
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [activeFloatingMenu, setActiveFloatingMenu] = useState<string | null>(null);

  const currentUserRecipes = useMemo(() => userRecipes || [], [userRecipes]);
  const currentNutriplannerRecipes = useMemo(() => nutriplannerRecipes || [], [nutriplannerRecipes]);
  
  const currentWeekPlan = useMemo(() => {
    if (weekPlanLoading || profileLoading) return []; 
    
    if ((!weekPlanData || weekPlanData.length === 0) && userProfile) {
       return INITIAL_WEEK_PLAN;
    }
    
    const planMap = new Map((weekPlanData || []).map(day => [day.day, day]));

    const fullWeek = INITIAL_WEEK_PLAN.map(defaultDay => 
      planMap.get(defaultDay.day) || defaultDay
    );

    return fullWeek.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

  }, [weekPlanData, weekPlanLoading, userProfile, profileLoading]);

  const currentStickyNote = useMemo(() => userProfile?.stickyNote || '¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.', [userProfile]);
  const currentCalorieResult = useMemo(() => userProfile?.calorieResult || null, [userProfile]);
  
  const handleToggleFloatingMenu = (menu: string) => {
    setActiveFloatingMenu(prev => (prev === menu ? null : menu));
  };


  const handleDrop = useCallback((day: string, mealType: MealType, droppedRecipe: Recipe) => {
    if (!user || !currentWeekPlan) return;
  
    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    const targetDay = currentWeekPlan.find(d => d.day === day);
  
    if (targetDay) {
      const updatedMeals = {
        ...targetDay.meals,
        [mealType]: {
          ...targetDay.meals[mealType],
          recipes: [...targetDay.meals[mealType].recipes, droppedRecipe]
        }
      };
      
      const updatedDayPlan = { ...targetDay, meals: updatedMeals };
      setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
    }
  }, [user, firestore, currentWeekPlan]);
  
  const handleClearMeal = useCallback((day: string, mealType: MealType) => {
    if (!user || !currentWeekPlan) return;

    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    const targetDay = currentWeekPlan.find(d => d.day === day);

    if (targetDay) {
      const updatedMeals = {
        ...targetDay.meals,
        [mealType]: {
          ...targetDay.meals[mealType],
          recipes: []
        }
      };
      
      const updatedDayPlan = { ...targetDay, meals: updatedMeals };
      setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
    }
  }, [user, firestore, currentWeekPlan]);
  
  const handleRemoveRecipeFromMeal = useCallback((day: string, mealType: MealType, recipeId: string) => {
    if (!user || !currentWeekPlan) return;

    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    const targetDay = currentWeekPlan.find(d => d.day === day);

    if (targetDay) {
        const updatedRecipes = targetDay.meals[mealType].recipes.filter(r => r.id !== recipeId);
        const updatedMeals = {
          ...targetDay.meals,
          [mealType]: {
            ...targetDay.meals[mealType],
            recipes: updatedRecipes
          }
        };

        const updatedDayPlan = { ...targetDay, meals: updatedMeals };
        setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
    }
  }, [user, firestore, currentWeekPlan]);

  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe: boolean = false) => {
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe || undefined,
      isNutriPlannerRecipe,
    });
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogState({ open: false });
  }, []);

  const handleSaveRecipe = useCallback((recipe: Recipe) => {
    if (!user || !userRecipesCollectionRef) return;
    
    const isExistingUserRecipe = recipe.id && currentUserRecipes.some(r => r.id === recipe.id);

    if (isExistingUserRecipe) { 
      const recipeRef = doc(userRecipesCollectionRef, recipe.id);
      setDocumentNonBlocking(recipeRef, recipe, { merge: true });
       toast({
        title: '¡Receta actualizada!',
        description: `${recipe.name} se ha actualizado en tu biblioteca.`,
      });
    } else { 
      const newRecipeRef = doc(userRecipesCollectionRef);
      addDocumentNonBlocking(userRecipesCollectionRef, { ...recipe, id: newRecipeRef.id });
      toast({
        title: '¡Receta guardada!',
        description: `${recipe.name} se ha guardado en tu biblioteca.`,
      });
    }
    handleDialogClose();
  }, [handleDialogClose, toast, user, userRecipesCollectionRef, currentUserRecipes]);


  const handleDeleteRecipe = useCallback((recipeId: string) => {
    if (!user || !userRecipesCollectionRef || !firestore) return;
    
    const batch = writeBatch(firestore);
    
    const recipeRef = doc(userRecipesCollectionRef, recipeId);
    batch.delete(recipeRef);
    
    (currentWeekPlan || []).forEach(dayPlan => {
      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', dayPlan.day);
      const newMeals = { ...dayPlan.meals };
      let dayWasUpdated = false;
      
      (Object.keys(newMeals) as MealType[]).forEach(mealType => {
        const meal = newMeals[mealType];
        const initialLength = meal.recipes.length;
        const filteredRecipes = meal.recipes.filter(r => r.id !== recipeId);
        
        if (initialLength > filteredRecipes.length) {
          newMeals[mealType] = { ...meal, recipes: filteredRecipes };
          dayWasUpdated = true;
        }
      });
      
      if (dayWasUpdated) {
        batch.set(dayDocRef, { meals: newMeals }, { merge: true });
      }
    });
    
    batch.commit().then(() => {
        toast({
            title: 'Receta eliminada',
            description: 'La receta ha sido eliminada de tu biblioteca y de tu plan semanal.',
        });
    }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${user.uid}/recipes/${recipeId}`,
            operation: 'delete',
            requestResourceData: { note: 'Batch delete recipe and update week plan.' }
        }));
    });
    
    handleDialogClose();
  }, [handleDialogClose, user, firestore, userRecipesCollectionRef, currentWeekPlan, toast]);

  const handleCopyRecipe = useCallback((recipe: Recipe) => {
    if (!user || !userRecipesCollectionRef) return;
    
    const { id, ...recipeData } = recipe;
    
    const newRecipeRef = doc(userRecipesCollectionRef);
    addDocumentNonBlocking(userRecipesCollectionRef, { ...recipeData, id: newRecipeRef.id });

    toast({
        title: '¡Receta Copiada!',
        description: `${recipe.name} ha sido añadida a "Mis Recetas".`,
    });
  }, [user, userRecipesCollectionRef, toast]);


  const dailyTotals = useMemo(() => {
    return (currentWeekPlan || []).map(dayPlan => {
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      Object.values(dayPlan.meals).forEach(meal => {
        meal.recipes.forEach(recipe => {
          totals.calories += recipe.calories;
          totals.protein += recipe.protein;
          totals.carbs += recipe.carbs;
          totals.fat += recipe.fat;
        });
      });
      return { day: dayPlan.day, totals };
    });
  }, [currentWeekPlan]);
  
  const handleNoteSave = useCallback((content: string) => {
    if (user && userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { stickyNote: content });
    }
  }, [user, userProfileRef]);

  const handleCalorieResultSave = useCallback((result: CalculationResult) => {
     if (user && userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, { calorieResult: result });
    }
  }, [user, userProfileRef]);

  const isLoading = userLoading || userRecipesLoading || nutriplannerRecipesLoading || weekPlanLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu planificador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <PageHeader />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-6">
          <div className="w-full">
            <MealPlanner
              weekPlan={currentWeekPlan || INITIAL_WEEK_PLAN}
              dailyTotals={dailyTotals}
              onDrop={handleDrop}
              onClearMeal={handleClearMeal}
              onRecipeClick={(recipe) => handleRecipeAction('view', recipe)}
              onRemoveRecipeFromMeal={handleRemoveRecipeFromMeal}
            />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <RecipeLibrary 
              userRecipes={currentUserRecipes}
              nutriplannerRecipes={currentNutriplannerRecipes}
              onRecipeAction={handleRecipeAction}
              onCopyRecipe={handleCopyRecipe}
            />
          </div>
        </div>
      </main>
      <RecipeDialog
        dialogState={dialogState}
        onClose={handleDialogClose}
        onSave={handleSaveRecipe}
        onDelete={handleDeleteRecipe}
        onEdit={(recipe) => handleRecipeAction('edit', recipe)}
        onCopy={handleCopyRecipe}
      />
      
      <ShoppingListSheet
        weekPlan={currentWeekPlan || INITIAL_WEEK_PLAN}
        isOpen={activeFloatingMenu === 'shopping-list'}
        onToggle={() => handleToggleFloatingMenu('shopping-list')}
      />
      <FloatingGoals
        calorieResult={currentCalorieResult}
        onCalorieResultSave={handleCalorieResultSave}
        isOpen={activeFloatingMenu === 'goals'}
        onToggle={() => handleToggleFloatingMenu('goals')}
      />
      <StickyNote
        initialContent={currentStickyNote}
        onSave={handleNoteSave}
        isOpen={activeFloatingMenu === 'sticky-note'}
        onToggle={() => handleToggleFloatingMenu('sticky-note')}
      />
    </div>
  );
}
