'use client';

import { useState, useCallback, useMemo } from 'react';
import type { DayPlan, Recipe, Meal, WeekPlan, DialogState, UserProfile, CalculationResult } from '@/lib/types';
import { INITIAL_WEEK_PLAN } from '@/lib/data';
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


const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Dashboard() {
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const { firestore, storage } = useFirebase();

  const userRecipesCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: userRecipes, isLoading: userRecipesLoading } = useCollection<Recipe>(userRecipesCollectionRef);

  const nutriplannerRecipesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'nutriplanner_recipes') : null, [firestore]);
  const { data: nutriplannerRecipes, isLoading: nutriplannerRecipesLoading } = useCollection<Recipe>(nutriplannerRecipesCollectionRef);

  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);
  
  const userProfileRef = useMemoFirebase(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [activeFloatingMenu, setActiveFloatingMenu] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentUserRecipes = useMemo(() => userRecipes || [], [userRecipes]);
  const currentNutriplannerRecipes = useMemo(() => nutriplannerRecipes || [], [nutriplannerRecipes]);
  
  const currentWeekPlan = useMemo(() => {
    // Critical fix: If weekPlanData is null (during loading) or empty, return the initial plan immediately.
    if (!weekPlanData || weekPlanData.length === 0) {
      return INITIAL_WEEK_PLAN;
    }
    
    const planMap = new Map(weekPlanData.map(day => [day.day, day]));

    // If the saved data from the DB is empty, fall back to the initial plan.
    if (planMap.size === 0) {
      return INITIAL_WEEK_PLAN;
    }

    // Build the full week, ensuring all days are present and in order.
    return DAY_ORDER.map(dayName => {
        const savedDay = planMap.get(dayName as DayPlan['day']);
        if (savedDay) {
          // Ensure meals array is always valid to prevent downstream errors.
          const meals = Array.isArray(savedDay.meals) ? savedDay.meals : [];
          return { ...savedDay, day: dayName as DayPlan['day'], meals };
        }
        // Fallback to a default structure for a day if it's missing from the database
        return INITIAL_WEEK_PLAN.find(d => d.day === dayName)!;
    });

  }, [weekPlanData]);

  const currentStickyNote = useMemo(() => userProfile?.stickyNote || '¡Bienvenido a NutriPlanner! Usa esta nota para apuntar lo que quieras.', [userProfile]);
  const currentCalorieResult = useMemo(() => userProfile?.calorieResult || null, [userProfile]);
  
  const handleToggleFloatingMenu = (menu: string) => {
    setActiveFloatingMenu(prev => (prev === menu ? null : menu));
  };


  const handleDrop = useCallback((day: string, mealId: string, droppedRecipe: Recipe) => {
    if (!user || !firestore || !currentWeekPlan) return;

    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    const targetDay = currentWeekPlan.find(d => d.day === day);

    if (targetDay) {
      const updatedMeals = targetDay.meals.map(meal => 
        meal.id === mealId 
          ? { ...meal, recipes: [...meal.recipes, droppedRecipe] } 
          : meal
      );
      
      const updatedDayPlan = { ...targetDay, meals: updatedMeals };
      setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
    }
  }, [user, firestore, currentWeekPlan]);
  
  const handleClearMeal = useCallback((day: string, mealId: string) => {
    if (!user || !firestore || !currentWeekPlan) return;

    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    const targetDay = currentWeekPlan.find(d => d.day === day);

    if (targetDay) {
      const updatedMeals = targetDay.meals.map(meal => 
        meal.id === mealId 
          ? { ...meal, recipes: [] }
          : meal
      );
      
      const updatedDayPlan = { ...targetDay, meals: updatedMeals };
      setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
    }
  }, [user, firestore, currentWeekPlan]);
  
  const handleRemoveRecipeFromMeal = useCallback((day: string, mealId: string, recipeId: string) => {
    if (!user || !firestore || !currentWeekPlan) return;

    const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
    const targetDay = currentWeekPlan.find(d => d.day === day);

    if (targetDay) {
        const updatedMeals = targetDay.meals.map(meal => {
            if (meal.id === mealId) {
                const updatedRecipes = meal.recipes.filter(r => r.id !== recipeId);
                return { ...meal, recipes: updatedRecipes };
            }
            return meal;
        });

        const updatedDayPlan = { ...targetDay, meals: updatedMeals };
        setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
    }
  }, [user, firestore, currentWeekPlan]);

    const handleUpdateMealTitle = useCallback((day: string, mealId: string, newTitle: string) => {
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
    }, [user, firestore, currentWeekPlan]);

    const handleAddMeal = useCallback((day: string) => {
        if (!user || !firestore || !currentWeekPlan) return;

        const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
        const targetDay = currentWeekPlan.find(d => d.day === day);

        if (targetDay) {
            const newMeal: Meal = {
                id: `meal-${Date.now()}`,
                title: 'Nueva Comida',
                recipes: [],
            };
            const updatedMeals = [...targetDay.meals, newMeal];
            const updatedDayPlan = { ...targetDay, meals: updatedMeals };
            setDocumentNonBlocking(dayDocRef, updatedDayPlan, { merge: true });
        }
    }, [user, firestore, currentWeekPlan]);

    const handleDeleteMeal = useCallback((day: string, mealId: string) => {
        if (!user || !firestore || !currentWeekPlan) return;

        const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
        const targetDay = currentWeekPlan.find(d => d.day === day);

        if (targetDay) {
            const updatedMeals = targetDay.meals.filter(meal => meal.id !== mealId);
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

  const handleSaveRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean, existingId?: string) => {
    if (!user || !firestore || !storage) return;

    setIsSaving(true);
    
    try {
        const targetCollectionRef = isGlobal ? nutriplannerRecipesCollectionRef : userRecipesCollectionRef;
        if (!targetCollectionRef) throw new Error("Colección de destino no encontrada.");

        // Determine the recipe ID: use existing, or generate a new one.
        const recipeId = existingId || doc(targetCollectionRef).id;
        let finalImageUrl = (existingId && (isGlobal ? currentNutriplannerRecipes : currentUserRecipes).find(r => r.id === existingId)?.imageUrl) || '';

        // Step 1: Upload image if a new one is provided
        if (imageFile) {
          try {
            finalImageUrl = await uploadImageAndGetUrl(storage, imageFile, recipeId);
          } catch(uploadError) {
             console.error("Error al subir la imagen:", uploadError);
             toast({
                variant: "destructive",
                title: "¡Oh no! Error de subida.",
                description: "No se pudo subir la imagen. Por favor, inténtalo de nuevo.",
            });
             setIsSaving(false);
             return;
          }
        }
        
        // Step 2: Prepare final recipe object with the correct ID and image URL
        const finalRecipe: Recipe = { 
            ...recipe, 
            id: recipeId,
            imageUrl: finalImageUrl 
        };

        // Step 3: Save recipe to Firestore
        const recipeRef = doc(targetCollectionRef, recipeId);
        await setDocumentNonBlocking(recipeRef, finalRecipe, { merge: true });
        
        // Step 4: Show success feedback and close dialog
        const isExistingRecipe = !!existingId;

        toast({
            title: isExistingRecipe ? '¡Receta actualizada!' : '¡Receta guardada!',
            description: `${finalRecipe.name} se ha ${isExistingRecipe ? 'actualizado' : 'guardado'}.`,
        });

        handleDialogClose();

    } catch (error) {
        console.error("Error al guardar la receta:", error);
        toast({
            variant: "destructive",
            title: "¡Oh no! Algo salió mal.",
            description: (error as Error).message || "No se pudo guardar la receta.",
        });
    } finally {
        setIsSaving(false);
    }
}, [user, firestore, storage, nutriplannerRecipesCollectionRef, userRecipesCollectionRef, currentNutriplannerRecipes, currentUserRecipes, toast, handleDialogClose]);



  const handleDeleteRecipe = useCallback(async (recipeId: string, isGlobal: boolean) => {
    if (!user || !firestore) return;
    
    const targetCollectionRef = isGlobal ? nutriplannerRecipesCollectionRef : userRecipesCollectionRef;
    if (!targetCollectionRef) return;

    const recipeRef = doc(targetCollectionRef, recipeId);
    deleteDocumentNonBlocking(recipeRef);

    if (!isGlobal) {
        try {
            const batch = writeBatch(firestore);
            (currentWeekPlan || []).forEach(dayPlan => {
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

    toast({
        title: 'Receta eliminada',
        description: 'La receta ha sido eliminada permanentemente.',
    });
    
    handleDialogClose();
  }, [handleDialogClose, user, firestore, userRecipesCollectionRef, nutriplannerRecipesCollectionRef, currentWeekPlan, toast]);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-glass">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando tu planificador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-foreground font-body">
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
              onUpdateMealTitle={handleUpdateMealTitle}
              onAddMeal={handleAddMeal}
              onDeleteMeal={handleDeleteMeal}
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
        isSaving={isSaving}
        onClose={handleDialogClose}
        onSave={handleSaveRecipe}
        onDelete={handleDeleteRecipe}
        onEdit={(recipe, isGlobal) => handleRecipeAction('edit', recipe, isGlobal)}
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

    