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
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { Logo } from '@/components/icons/logo';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';


const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Dashboard() {
  const { toast } = useToast();
  const { user, loading } = useUser();
  const firestore = useFirestore();

  // Firestore-backed state for logged-in users
  const recipesCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'recipes') : null, [firestore, user]);
  const { data: recipes, loading: recipesLoading } = useCollection<Recipe>(recipesCollectionRef);
  
  const weekPlanCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'weekPlan') : null, [firestore, user]);
  const { data: weekPlanData, loading: weekPlanLoading } = useCollection<WeekPlan[0]>(weekPlanCollectionRef);
  
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [filterQuery, setFilterQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name-asc');
  const [isSuggesterOpen, setIsSuggesterOpen] = useState(false);
  const [activeFloatingMenu, setActiveFloatingMenu] = useState<string | null>(null);
  
  // Save initial data to Firestore for new users
  useEffect(() => {
    if (user && !recipesLoading && !weekPlanLoading && !profileLoading && recipes?.length === 0 && weekPlanData?.length === 0 && !userProfile) {
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
  }, [user, firestore, recipes, weekPlanData, userProfile, recipesLoading, weekPlanLoading, profileLoading]);

  // Handle data based on user auth state
  const currentRecipes = useMemo(() => recipes || [], [recipes]);
  
  const currentWeekPlan = useMemo(() => {
    if (!weekPlanData) return INITIAL_WEEK_PLAN; // Return default structure if no data
    
    // Create a map for quick lookups
    const planMap = new Map(weekPlanData.map(day => [day.day, day]));

    // Build the full week, using saved data or the default structure
    const fullWeek = INITIAL_WEEK_PLAN.map(defaultDay => 
      planMap.get(defaultDay.day) || defaultDay
    );

    // Sort the final array to ensure correct day order
    return fullWeek.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

  }, [weekPlanData]);

  const currentStickyNote = useMemo(() => userProfile?.stickyNote || '', [userProfile]);
  const currentCalorieResult = useMemo(() => userProfile?.calorieResult || null, [userProfile]);
  
  const handleToggleFloatingMenu = (menu: string) => {
    setActiveFloatingMenu(prev => (prev === menu ? null : menu));
  };


  const handleDrop = useCallback(async (day: string, mealType: MealType, droppedRecipe: Recipe) => {
    if (user && currentWeekPlan) {
      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
      const targetDay = currentWeekPlan.find(d => d.day === day);
      if (targetDay) {
        const updatedRecipes = [...targetDay.meals[mealType].recipes, droppedRecipe];
        updateDocumentNonBlocking(dayDocRef, { [`meals.${mealType}.recipes`]: updatedRecipes });
      }
    }
  }, [user, firestore, currentWeekPlan]);
  
  const handleClearMeal = useCallback(async (day: string, mealType: MealType) => {
    if (user) {
      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
      updateDocumentNonBlocking(dayDocRef, { [`meals.${mealType}.recipes`]: [] });
    }
  }, [user, firestore]);
  
  const handleRemoveRecipeFromMeal = useCallback(async (day: string, mealType: MealType, recipeId: string) => {
    if (user && currentWeekPlan) {
      const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', day);
      const targetDay = currentWeekPlan.find(d => d.day === day);
      if (targetDay) {
        const updatedRecipes = targetDay.meals[mealType].recipes.filter(r => r.id !== recipeId);
        updateDocumentNonBlocking(dayDocRef, { [`meals.${mealType}.recipes`]: updatedRecipes });
      }
    }
  }, [user, firestore, currentWeekPlan]);

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
    if (user && recipesCollectionRef) {
      const recipeRef = doc(recipesCollectionRef, recipe.id);
      setDocumentNonBlocking(recipeRef, recipe, { merge: true });
    }

    toast({
      title: '¡Receta guardada!',
      description: `${recipe.name} se ha guardado en tu biblioteca.`,
    });
    handleDialogClose();
  }, [handleDialogClose, toast, user, recipesCollectionRef]);

  const handleDeleteRecipe = useCallback(async (recipeId: string) => {
    if (user && recipesCollectionRef) {
      const batch = writeBatch(firestore);

      const recipeRef = doc(recipesCollectionRef, recipeId);
      batch.delete(recipeRef);

      if (currentWeekPlan) {
        currentWeekPlan.forEach(dayPlan => {
            const dayDocRef = doc(firestore, 'users', user.uid, 'weekPlan', dayPlan.day);
            const newMeals = { ...dayPlan.meals };
            let updated = false;

            (Object.keys(newMeals) as MealType[]).forEach(mealType => {
                const meal = newMeals[mealType];
                const initialLength = meal.recipes.length;
                const filteredRecipes = meal.recipes.filter(r => r.id !== recipeId);
                if (initialLength > filteredRecipes.length) {
                    newMeals[mealType] = { ...meal, recipes: filteredRecipes };
                    updated = true;
                }
            });
            if (updated) {
                 batch.update(dayDocRef, { meals: newMeals });
            }
        });
      }
      
      await batch.commit();
    }
    handleDialogClose();
  }, [handleDialogClose, user, recipesCollectionRef, currentWeekPlan, firestore]);

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
  
  const filteredAndSortedRecipes = useMemo(() => {
    const filtered = (currentRecipes || []).filter(recipe => {
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
    if (user && recipesCollectionRef) {
      const batch = writeBatch(firestore);
      suggestedRecipes.forEach(recipe => {
        const recipeRef = doc(recipesCollectionRef);
        batch.set(recipeRef, { ...recipe, id: recipeRef.id });
      });
      batch.commit();
    }
    
    toast({
        title: '¡Recetas añadidas!',
        description: `${suggestedRecipes.length} nuevas recetas se han añadido a tu biblioteca.`,
    });
  }, [toast, user, recipesCollectionRef, firestore]);

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
