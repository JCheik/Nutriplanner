'use client';

import { useState, useCallback, useMemo } from 'react';
import type { DayPlan, Recipe, Meal, WeekPlan, DialogState, UserProfile, CalculationResult, GoalType } from '@/lib/types';
import { INITIAL_WEEK_PLAN, INITIAL_RECIPES } from '@/lib/data';
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

  const nutriplannerRecipesCollectionRef = useMemoFirebase(() => (firestore && !isGuestMode) ? collection(firestore, 'nutriplanner_recipes') : null, [firestore, isGuestMode]);
  const { data: nutriplannerRecipes, isLoading: nutriplannerRecipesLoading } = useCollection<Recipe>(nutriplannerRecipesCollectionRef);

  const weekPlanCollectionRef = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, isLoading: weekPlanLoading } = useCollection<DayPlan>(weekPlanCollectionRef);
  
  const userProfileRef = useMemoFirebase(() => (user && firestore) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
  
  // Dialog and UI state
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [activeFloatingMenu, setActiveFloatingMenu] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGuestPromptOpen, setIsGuestPromptOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<GoalType>('maintenance');


  // Memoized data sources based on auth state
  const currentUserRecipes = useMemo(() => isGuestMode ? guestRecipes : (userRecipes || []), [isGuestMode, guestRecipes, userRecipes]);
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
  
  const handleToggleFloatingMenu = (menu: string) => {
    setActiveFloatingMenu(prev => (prev === menu ? null : menu));
  };


  const handleDrop = useCallback((day: string, mealId: string, droppedRecipe: Recipe) => {
    const updateLogic = (plan: WeekPlan) => plan.map(dayPlan =>
      dayPlan.day === day
        ? { ...dayPlan, meals: dayPlan.meals.map(meal => 
            meal.id === mealId 
              ? { ...meal, recipes: [...meal.recipes, droppedRecipe] } 
              : meal
          )}
        : dayPlan
    );

    if (isGuestMode) {
      setGuestWeekPlan(updateLogic);
    } else {
       if (!user || !firestore) return;
       const targetDay = currentWeekPlan.find(d => d.day === day);
       if (targetDay) {
        const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
        const updatedMeals = targetDay.meals.map(meal => 
          meal.id === mealId ? { ...meal, recipes: [...meal.recipes, droppedRecipe] } : meal
        );
        setDocumentNonBlocking(dayDocRef, { ...targetDay, meals: updatedMeals }, { merge: true });
       }
    }
  }, [user, firestore, currentWeekPlan, isGuestMode]);
  
  const handleClearMeal = useCallback((day: string, mealId: string) => {
    const updateLogic = (plan: WeekPlan) => plan.map(dayPlan =>
      dayPlan.day === day
        ? { ...dayPlan, meals: dayPlan.meals.map(meal => 
            meal.id === mealId ? { ...meal, recipes: [] } : meal
          )}
        : dayPlan
    );

    if (isGuestMode) {
      setGuestWeekPlan(updateLogic);
    } else {
        if (!user || !firestore) return;
        const targetDay = currentWeekPlan.find(d => d.day === day);
        if (targetDay) {
          const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
          const updatedMeals = targetDay.meals.map(meal => meal.id === mealId ? { ...meal, recipes: [] } : meal);
          setDocumentNonBlocking(dayDocRef, { ...targetDay, meals: updatedMeals }, { merge: true });
        }
    }
  }, [user, firestore, currentWeekPlan, isGuestMode]);
  
  const handleRemoveRecipeFromMeal = useCallback((day: string, mealId: string, recipeId: string) => {
     const updateLogic = (plan: WeekPlan) => plan.map(dayPlan =>
      dayPlan.day === day
        ? { ...dayPlan, meals: dayPlan.meals.map(meal => 
            meal.id === mealId ? { ...meal, recipes: meal.recipes.filter(r => r.id !== recipeId) } : meal
          )}
        : dayPlan
    );

    if (isGuestMode) {
      setGuestWeekPlan(updateLogic);
    } else {
      if (!user || !firestore) return;
      const targetDay = currentWeekPlan.find(d => d.day === day);
      if (targetDay) {
        const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
        const updatedMeals = targetDay.meals.map(meal => 
          meal.id === mealId ? { ...meal, recipes: meal.recipes.filter(r => r.id !== recipeId) } : meal
        );
        setDocumentNonBlocking(dayDocRef, { ...targetDay, meals: updatedMeals }, { merge: true });
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

  const handleAddMeal = useCallback((day: string) => {
      if (promptToRegister()) return;
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
        
        const finalRecipe: Recipe = { ...recipe, id: recipeId, imageUrl: finalImageUrl };
        const recipeRef = doc(targetCollectionRef, recipeId);
        await setDocumentNonBlocking(recipeRef, finalRecipe, { merge: true });
        
        const isExistingRecipe = !!existingId;
        toast({ title: isExistingRecipe ? '¡Receta actualizada!' : '¡Receta guardada!', description: `${finalRecipe.name} se ha ${isExistingRecipe ? 'actualizado' : 'guardado'}.` });
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

  const isLoading = !isGuestMode && (userLoading || userRecipesLoading || nutriplannerRecipesLoading || weekPlanLoading || profileLoading);

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
              activeGoal={currentCalorieResult ? currentCalorieResult[activeGoal] : null}
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
        weekPlan={currentWeekPlan}
        isOpen={activeFloatingMenu === 'shopping-list'}
        onToggle={() => handleToggleFloatingMenu('shopping-list')}
      />
      <FloatingGoals
        calorieResult={currentCalorieResult}
        onCalorieResultSave={handleCalorieResultSave}
        isOpen={activeFloatingMenu === 'goals'}
        onToggle={() => handleToggleFloatingMenu('goals')}
        onGoalSelect={setActiveGoal}
      />
      <StickyNote
        initialContent={currentStickyNote}
        onSave={handleNoteSave}
        isOpen={activeFloatingMenu === 'sticky-note'}
        onToggle={() => handleToggleFloatingMenu('sticky-note')}
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
