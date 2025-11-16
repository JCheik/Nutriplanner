'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Recipe, WeekPlan, MealType, DialogState, SortCriteria } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_WEEK_PLAN } from '@/lib/data';
import { PageHeader } from '@/components/layout/page-header';
import { RecipeLibrary } from '@/components/nutri-planner/recipe-library';
import { MealPlanner } from '@/components/nutri-planner/meal-planner';
import { RecipeDialog } from '@/components/nutri-planner/recipe-dialog';
import { useToast } from '@/hooks/use-toast';
import { AiSuggester } from '@/components/nutri-planner/ai-suggester';
import { suggestRecipesFromIngredients } from '@/ai/flows/suggest-recipes-from-ingredients';
import { AiSuggestionsDialog } from '@/components/nutri-planner/ai-suggestions-dialog';

export default function Home() {
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [weekPlan, setWeekPlan] = useState<WeekPlan>(INITIAL_WEEK_PLAN);
  const [dialogState, setDialogState] = useState<DialogState>({ open: false });
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name-asc');


  const handleDrop = useCallback((day: string, mealType: MealType, droppedRecipe: Recipe) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: { ...dayPlan.meals[mealType], recipe: droppedRecipe },
              },
            }
          : dayPlan
      )
    );
  }, []);
  
  const handleClearMeal = useCallback((day: string, mealType: MealType) => {
    setWeekPlan(prevPlan =>
      prevPlan.map(dayPlan =>
        dayPlan.day === day
          ? {
              ...dayPlan,
              meals: {
                ...dayPlan.meals,
                [mealType]: { ...dayPlan.meals[mealType], recipe: null },
              },
            }
          : dayPlan
      )
    );
  }, []);

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
    setRecipes(prevRecipes => {
      const exists = prevRecipes.some(r => r.id === recipe.id);
      if (exists) {
        return prevRecipes.map(r => (r.id === recipe.id ? recipe : r));
      }
      return [{ ...recipe, isAiSuggestion: false }, ...prevRecipes];
    });
     // If it was an AI suggestion, remove it from the suggestions list
    if (recipe.isAiSuggestion) {
      setSuggestedRecipes(prev => prev.filter(r => r.id !== recipe.id));
    }
    toast({
      title: '¡Receta guardada!',
      description: `${recipe.name} se ha guardado en tu biblioteca.`,
    });
    handleDialogClose();
  }, [handleDialogClose, toast]);

  const handleDeleteRecipe = useCallback((recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    setWeekPlan(prevPlan => 
      prevPlan.map(dayPlan => ({
        ...dayPlan,
        meals: {
          breakfast: dayPlan.meals.breakfast.recipe?.id === recipeId ? { ...dayPlan.meals.breakfast, recipe: null } : dayPlan.meals.breakfast,
          lunch: dayPlan.meals.lunch.recipe?.id === recipeId ? { ...dayPlan.meals.lunch, recipe: null } : dayPlan.meals.lunch,
          snack: dayPlan.meals.snack.recipe?.id === recipeId ? { ...dayPlan.meals.snack, recipe: null } : dayPlan.meals.snack,
          dinner: dayPlan.meals.dinner.recipe?.id === recipeId ? { ...dayPlan.meals.dinner, recipe: null } : dayPlan.meals.dinner,
        }
      }))
    );
    handleDialogClose();
  }, [handleDialogClose]);

  const dailyTotals = useMemo(() => {
    return weekPlan.map(dayPlan => {
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      Object.values(dayPlan.meals).forEach(meal => {
        if (meal.recipe) {
          totals.calories += meal.recipe.calories;
          totals.protein += meal.recipe.protein;
          totals.carbs += meal.recipe.carbs;
          totals.fat += meal.recipe.fat;
        }
      });
      return { day: dayPlan.day, totals };
    });
  }, [weekPlan]);

  const handleAiSuggest = async (ingredients: string[], dietaryPreferences: string) => {
    try {
      const result = await suggestRecipesFromIngredients({ ingredients, dietaryPreferences });
      if (result.recipes && result.recipes.length > 0) {
        const newRecipes: Recipe[] = result.recipes.map(r => {
          const recipeIngredients = r.ingredients.map(ing => {
            const [quantity, unit, ...nameParts] = ing.split(' ');
            return {
              id: self.crypto.randomUUID(),
              name: nameParts.join(' '),
              quantity: parseFloat(quantity) || 0,
              unit: unit || 'g',
              calories: 0, protein: 0, carbs: 0, fat: 0,
            };
          });

          return {
            id: self.crypto.randomUUID(),
            name: r.name,
            description: `Receta sugerida por IA basada en tus ingredientes.`,
            instructions: r.instructions,
            ingredients: recipeIngredients,
            calories: 0, protein: 0, carbs: 0, fat: 0,
            isAiSuggestion: true,
          };
        });
        
        setSuggestedRecipes(newRecipes);
        setIsSuggestionsOpen(true);
        return newRecipes;
      } else {
        toast({
          title: "No se encontraron recetas",
          description: "La IA no pudo encontrar ninguna receta con tus ingredientes. ¡Intenta añadir más!",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('La sugerencia de IA falló:', error);
      toast({
        title: "Error de IA",
        description: "Algo salió mal al obtener sugerencias. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleAddSelectedRecipes = useCallback((selectedRecipes: Recipe[]) => {
    const recipesToAdd = selectedRecipes.map(r => ({ ...r, isAiSuggestion: false }));
    setRecipes(prev => [...recipesToAdd, ...prev]);
    setSuggestedRecipes(prev => prev.filter(r => !selectedRecipes.find(sr => sr.id === r.id)));
    if (suggestedRecipes.length - selectedRecipes.length <= 0) {
      setIsSuggestionsOpen(false);
    }
    toast({
      title: '¡Recetas añadidas!',
      description: `${selectedRecipes.length} nuevas recetas se han añadido a tu biblioteca.`,
    });
  }, [suggestedRecipes, toast]);

  const handleEditSuggestion = (recipe: Recipe) => {
    setIsSuggestionsOpen(false);
    handleRecipeAction('edit', recipe);
  };
  
  const filteredAndSortedRecipes = useMemo(() => {
    const filtered = recipes.filter(recipe => {
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
  }, [recipes, filterQuery, sortCriteria]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <PageHeader />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-6">
          <div className="w-full">
            <MealPlanner
              weekPlan={weekPlan}
              dailyTotals={dailyTotals}
              onDrop={handleDrop}
              onClearMeal={handleClearMeal}
              onRecipeClick={(recipe) => handleRecipeAction('view', recipe)}
            />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <RecipeLibrary 
              recipes={filteredAndSortedRecipes} 
              onRecipeAction={handleRecipeAction}
              filterQuery={filterQuery}
              onFilterChange={setFilterQuery}
              sortCriteria={sortCriteria}
              onSortChange={setSortCriteria}
            />
            <AiSuggester onSuggest={handleAiSuggest} />
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
      <AiSuggestionsDialog
        isOpen={isSuggestionsOpen}
        onClose={() => setIsSuggestionsOpen(false)}
        suggestedRecipes={suggestedRecipes}
        onAddSelected={handleAddSelectedRecipes}
        onEdit={handleEditSuggestion}
      />
    </div>
  );
}
