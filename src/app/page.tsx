'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Recipe, WeekPlan, MealType, DialogState, SortCriteria, UserProfile, CalculationResult } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { AiSuggesterDialog } from '@/components/nutri-planner/ai-suggester-dialog';
import { suggestRecipes } from '@/ai/flows/suggest-recipes';
import { StickyNote } from '@/components/nutri-planner/sticky-note';
import { FloatingGoals } from '@/components/nutri-planner/floating-goals';
import { ShoppingListSheet } from '@/components/nutri-planner/shopping-list';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { updateDoc } from 'firebase/firestore';
import { Logo } from '@/components/icons/logo';


export default function Home() {
  const { toast } = useToast();
  const { user, loading } = useUser();
  const firestore = useFirestore();

  // Local state for anonymous users
  const [localRecipes, setLocalRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [localWeekPlan, setLocalWeekPlan] = useState<WeekPlan>(INITIAL_WEEK_PLAN);
  const [localStickyNote, setLocalStickyNote] = useState<string>('');
  const [localCalorieResult, setLocalCalorieResult] = useState<CalculationResult | null>(null);

  // Firestore-backed state for logged-in users
  const recipesCollectionRef = useMemo(() => user ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: recipes, setData: setRecipes, loading: recipesLoading } = useCollection<Recipe>(recipesCollectionRef);
  
  const weekPlanCollectionRef = useMemo(() => user ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlan, setData: setWeekPlan, loading: weekPlanLoading } = useCollection<WeekPlan[0]>(weekPlanCollectionRef, {
    onNewData: (data) => data.sort((a,b) => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].indexOf(a.day) - ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].indexOf(b.day))
  });
  
  const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, setData: setUserProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [filterQuery, setFilterQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name-asc');
  const [isSuggesterOpen, setIsSuggesterOpen] = useState(false);
  const [activeFloatingMenu, setActiveFloatingMenu] = useState<string | null>(null);
  
  // Save initial data to Firestore for new users
  useEffect(() => {
    if (user && !recipesLoading && !weekPlanLoading && !profileLoading && recipes?.length === 0 && weekPlan?.length === 0 && !userProfile) {
      const batch = writeBatch(firestore);
      
      // Add initial recipes
      INITIAL_RECIPES.forEach(recipe => {
        const recipeRef = doc(collection(firestore, 'users', user.uid, 'recipes'));
        batch.set(recipeRef, { ...recipe, id: recipeRef.id });
      });

      // Add initial week plan
      INITIAL_WEEK_PLAN.forEach(dayPlan => {
        const dayRef = doc(collection(firestore, 'users', user.uid, 'weekPlan'), dayPlan.day);
        batch.set(dayRef, dayPlan);
      });
      
      // Create user profile
      const profileRef = doc(firestore, 'users', user.uid);
      batch.set(profileRef, {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        stickyNote: '',
      });

      batch.commit().catch(console.error);
    }
  }, [user, firestore, recipes, weekPlan, userProfile, recipesLoading, weekPlanLoading, profileLoading]);

  // Handle data based on user auth state
  const currentRecipes = useMemo(() => user ? (recipes || []) : localRecipes, [user, recipes, localRecipes]);
  const currentWeekPlan = useMemo(() => user ? (weekPlan || []) : localWeekPlan, [user, weekPlan, localWeekPlan]);
  const currentStickyNote = useMemo(() => user ? (userProfile?.stickyNote || '') : localStickyNote, [user, userProfile, localStickyNote]);
  const currentCalorieResult = useMemo(() => user ? (userProfile?.calorieResult || null) : localCalorieResult, [user, userProfile, localCalorieResult]);
  
  // Before-unload warning for anonymous users
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!user) {
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? Inicia sesión para guardar tus cambios.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);
  
  const handleToggleFloatingMenu = (menu: string) => {
    setActiveFloatingMenu(prev => (prev === menu ? null : menu));
  };


  const handleDrop = useCallback(async (day: string, mealType: MealType, droppedRecipe: Recipe) => {
    const updateLogic = (prevPlan: WeekPlan) =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: { ...dayPlan.meals[mealType], recipes: [...dayPlan.meals[mealType].recipes, droppedRecipe] },
              },
            }
          : dayPlan
      );

    if (user) {
      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
      const targetDay = weekPlan?.find(d => d.day === day);
      if (targetDay) {
        const updatedRecipes = [...targetDay.meals[mealType].recipes, droppedRecipe];
        await updateDoc(dayDocRef, { [`meals.${mealType}.recipes`]: updatedRecipes });
      }
    } else {
      setLocalWeekPlan(updateLogic);
    }
  }, [user, firestore, weekPlan]);
  
  const handleClearMeal = useCallback(async (day: string, mealType: MealType) => {
    const updateLogic = (prevPlan: WeekPlan) =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: { ...dayPlan.meals[mealType], recipes: [] },
              },
            }
          : dayPlan
      );
    
    if (user) {
      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
      await updateDoc(dayDocRef, { [`meals.${mealType}.recipes`]: [] });
    } else {
      setLocalWeekPlan(updateLogic);
    }
  }, [user, firestore]);
  
  const handleRemoveRecipeFromMeal = useCallback(async (day: string, mealType: MealType, recipeId: string) => {
    const updateLogic = (prevPlan: WeekPlan) =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: {
                  ...dayPlan.meals[mealType],
                  recipes: dayPlan.meals[mealType].recipes.filter(r => r.id !== recipeId)
                },
              },
            }
          : dayPlan
      );
    
    if (user) {
      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
      const targetDay = weekPlan?.find(d => d.day === day);
      if (targetDay) {
        const updatedRecipes = targetDay.meals[mealType].recipes.filter(r => r.id !== recipeId);
        await updateDoc(dayDocRef, { [`meals.${mealType}.recipes`]: updatedRecipes });
      }
    } else {
      setLocalWeekPlan(updateLogic);
    }
  }, [user, firestore, weekPlan]);

  const handleRecipeAction = useCallback((action: 'view' | 'create' | 'edit', recipe?: Recipe) => {
    setDialogState({
      open: true,
      mode: action,
      recipe: recipe || undefined,
    });
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogState({ open: false });
  }, []);

  const handleSaveRecipe = useCallback((recipe: Recipe) => {
    const updateLogic = (prevRecipes: Recipe[]) => {
      const exists = prevRecipes.some(r => r.id === recipe.id);
      if (exists) {
        return prevRecipes.map(r => (r.id === recipe.id ? recipe : r));
      }
      return [ recipe, ...prevRecipes];
    };

    if (user && recipesCollectionRef) {
      const recipeRef = doc(recipesCollectionRef, recipe.id);
      setDoc(recipeRef, recipe, { merge: true });
    } else {
      setLocalRecipes(updateLogic);
    }

    toast({
      title: '¡Receta guardada!',
      description: `${recipe.name} se ha guardado en tu biblioteca.`,
    });
    handleDialogClose();
  }, [handleDialogClose, toast, user, recipesCollectionRef]);

  const handleDeleteRecipe = useCallback((recipeId: string) => {
    const updateWeekPlanLogic = (prevPlan: WeekPlan) => 
      prevPlan.map(dayPlan => ({
        ...dayPlan,
        meals: {
          breakfast: { ...dayPlan.meals.breakfast, recipes: dayPlan.meals.breakfast.recipes.filter(r => r.id !== recipeId) },
          lunch: { ...dayPlan.meals.lunch, recipes: dayPlan.meals.lunch.recipes.filter(r => r.id !== recipeId) },
          snack: { ...dayPlan.meals.snack, recipes: dayPlan.meals.snack.recipes.filter(r => r.id !== recipeId) },
          dinner: { ...dayPlan.meals.dinner, recipes: dayPlan.meals.dinner.recipes.filter(r => r.id !== recipeId) },
        }
      }));

    if (user && recipesCollectionRef && weekPlanCollectionRef) {
      // This is a bit more complex with subcollections, would need a transaction or batched write
      // For now, let's just delete the recipe. The meal plan will have a dangling reference.
      // A better solution would involve cloud functions to clean this up.
      const recipeRef = doc(recipesCollectionRef, recipeId);
      // deleteDoc(recipeRef);
      // For optimistic UI update, we can manually filter
      setRecipes(prev => prev?.filter(r => r.id !== recipeId));
    } else {
      setLocalRecipes(prev => prev.filter(r => r.id !== recipeId));
      setLocalWeekPlan(updateWeekPlanLogic);
    }
    handleDialogClose();
  }, [handleDialogClose, user, recipesCollectionRef, weekPlanCollectionRef, setRecipes]);

  const dailyTotals = useMemo(() => {
    return currentWeekPlan.map(dayPlan => {
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
  
  const filteredAndSortedRecipes = useMemo(() => {
    const filtered = currentRecipes.filter(recipe => {
      const query = filterQuery.toLowerCase();
      if (!query) return true;
      const nameMatch = recipe.name.toLowerCase().includes(query);
      const ingredientMatch = recipe.ingredients.some(ing => ing.name.toLowerCase().includes(query));
      return nameMatch || ingredientMatch;
    });

    const [key, order] = sortCriteria.split('-') as [keyof Recipe, 'asc' | 'desc'];

    return filtered.sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentRecipes, filterQuery, sortCriteria]);

  const handleAddSuggestedRecipes = useCallback((suggestedRecipes: Recipe[]) => {
    const updateLogic = (prev: Recipe[]) => [...suggestedRecipes, ...prev];
    
    if (user && recipesCollectionRef) {
      const batch = writeBatch(firestore);
      suggestedRecipes.forEach(recipe => {
        const recipeRef = doc(recipesCollectionRef);
        batch.set(recipeRef, { ...recipe, id: recipeRef.id });
      });
      batch.commit();
    } else {
      setLocalRecipes(updateLogic);
    }
    
    toast({
        title: '¡Recetas añadidas!',
        description: `${suggestedRecipes.length} nuevas recetas se han añadido a tu biblioteca.`,
    });
  }, [toast, user, recipesCollectionRef, firestore]);

  const handleNoteSave = useCallback((content: string) => {
    if (user && userProfileRef) {
      setUserProfile({ ...userProfile, stickyNote: content } as UserProfile, { merge: true });
    } else {
      setLocalStickyNote(content);
    }
  }, [user, userProfile, userProfileRef, setUserProfile]);

  const handleCalorieResultSave = useCallback((result: CalculationResult) => {
     if (user && userProfileRef) {
      setUserProfile({ ...userProfile, calorieResult: result } as UserProfile, { merge: true });
    } else {
      setLocalCalorieResult(result);
    }
  }, [user, userProfile, userProfileRef, setUserProfile]);

  const isLoading = loading || recipesLoading || weekPlanLoading || profileLoading;

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
              weekPlan={currentWeekPlan}
              dailyTotals={dailyTotals}
              onDrop={handleDrop}
              onClearMeal={handleClearMeal}
              onRecipeClick={(recipe) => handleRecipeAction('view', recipe)}
              onRemoveRecipeFromMeal={handleRemoveRecipeFromMeal}
            />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <RecipeLibrary 
              recipes={filteredAndSortedRecipes} 
              onRecipeAction={handleRecipeAction}
              onSuggestClick={() => setIsSuggesterOpen(true)}
              filterQuery={filterQuery}
              onFilterChange={setFilterQuery}
              sortCriteria={sortCriteria}
              onSortChange={setSortCriteria}
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
      />
      <AiSuggesterDialog
        isOpen={isSuggesterOpen}
        onClose={() => setIsSuggesterOpen(false)}
        onSuggest={suggestRecipes}
        onAddRecipes={handleAddSuggestedRecipes}
        onEditRecipe={(recipe) => handleRecipeAction('edit', recipe)}
      />
      
      {/* Floating Action Buttons & Panels */}
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
