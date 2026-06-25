'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter } from 'lucide-react';
import type { Meal, Recipe, DietTag } from '@/lib/types';
import { DIET_TAG_LABELS } from '@/lib/constants';
import { normalizeText, cn } from '@/lib/utils';
import { RecipeCard } from './recipe-card';
import {
  SMART_CATEGORY_ORDER,
  SMART_CATEGORY_LABELS,
  type SmartCategory,
  groupRecipesByCategory,
} from '@/lib/recipe-categories';

interface RecipeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meal: Meal;
  allRecipes: Recipe[];
  onSave: (selectedRecipes: Recipe[]) => void;
  /** The user's saved diet preference; drives the optional diet filter. */
  dietPreference?: DietTag[];
}

export function RecipeSelectionDialog({ isOpen, onClose, meal, allRecipes, onSave, dietPreference = [] }: RecipeSelectionDialogProps) {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  // 'all' shows every category grouped; a specific category narrows the list so
  // the user doesn't have to scroll past 100 recipes to reach e.g. "Cenas".
  const [activeCategory, setActiveCategory] = useState<SmartCategory | 'all'>('all');
  // Default to filtering by the user's saved diet (when they have one); they can
  // toggle it off to see every recipe.
  const [dietFilterOn, setDietFilterOn] = useState(dietPreference.length > 0);

  const hasDietPref = dietPreference.length > 0;
  const dietLabel = dietPreference.map((d) => DIET_TAG_LABELS[d] ?? d).join(', ');

  useEffect(() => {
    if (isOpen) {
      setSelectedRecipeIds(new Set());
      setSearchQuery('');
      setActiveCategory('all');
      setDietFilterOn(hasDietPref);
    }
  }, [isOpen, meal, hasDietPref]);

  const handleToggleRecipe = (recipeId: string) => {
    setSelectedRecipeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    const selectedRecipes = allRecipes.filter(r => selectedRecipeIds.has(r.id));
    onSave(selectedRecipes);
    onClose();
  };

  // Search + dedupe + not-already-in-meal + optional diet filter.
  const filteredRecipes = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    const existingRecipeIdsInMeal = new Set(meal.recipes.map(r => r.id));

    // Deduplicate recipes by ID (user recipes override global ones with the same ID)
    const uniqueRecipesMap = new Map<string, Recipe>();
    allRecipes.forEach(recipe => {
      if (!uniqueRecipesMap.has(recipe.id)) {
        uniqueRecipesMap.set(recipe.id, recipe);
      }
    });

    return Array.from(uniqueRecipesMap.values()).filter(recipe => {
      if (existingRecipeIdsInMeal.has(recipe.id)) return false; // already in the meal
      if (!normalizeText(recipe.name).includes(normalizedQuery)) return false;
      if (dietFilterOn && hasDietPref) {
        // Same semantics as the library: untagged recipes are wildcards;
        // otherwise the recipe must share at least one tag with the diet.
        const tags = recipe.dietTags ?? [];
        if (tags.length > 0 && !dietPreference.some(d => tags.includes(d))) return false;
      }
      return true;
    });
  }, [searchQuery, allRecipes, meal.recipes, dietFilterOn, hasDietPref, dietPreference]);

  // Group the filtered recipes by smart category, keeping only non-empty buckets
  // in their canonical order.
  const groups = useMemo(() => {
    const grouped = groupRecipesByCategory(filteredRecipes);
    return SMART_CATEGORY_ORDER
      .map(cat => ({ cat, label: SMART_CATEGORY_LABELS[cat], recipes: grouped[cat] }))
      .filter(g => g.recipes.length > 0);
  }, [filteredRecipes]);

  // If the active category emptied out (e.g. after toggling the diet filter),
  // fall back to showing all so the list never looks mysteriously empty.
  const effectiveCategory =
    activeCategory !== 'all' && !groups.some(g => g.cat === activeCategory) ? 'all' : activeCategory;

  const visibleGroups = effectiveCategory === 'all'
    ? groups
    : groups.filter(g => g.cat === effectiveCategory);

  const chipClass = (active: boolean) =>
    cn(
      'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-background text-muted-foreground border-border hover:bg-muted'
    );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-md h-[90vh] flex flex-col bg-glass")}>
        <DialogHeader>
          <DialogTitle>Añadir a {meal.title}</DialogTitle>
          <DialogDescription>
            Elige las recetas que quieres añadir a esta comida.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar recetas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
            />
        </div>

        {hasDietPref && (
          <button
            type="button"
            onClick={() => setDietFilterOn(v => !v)}
            title={dietLabel}
            className={cn(
              'inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-xs font-medium border transition-colors max-w-full',
              dietFilterOn
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            <Filter className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{dietFilterOn ? `Solo mi dieta: ${dietLabel}` : 'Ver todas las dietas'}</span>
          </button>
        )}

        {groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chipClass(effectiveCategory === 'all')} onClick={() => setActiveCategory('all')}>
              Todas
            </button>
            {groups.map(g => (
              <button
                key={g.cat}
                type="button"
                className={chipClass(effectiveCategory === g.cat)}
                onClick={() => setActiveCategory(g.cat)}
              >
                {g.label} ({g.recipes.length})
              </button>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 -mx-6">
            <div className="px-6 space-y-4">
                {visibleGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
                        <Search className="h-8 w-8 mb-2 text-muted-foreground/50" />
                        <p className="text-sm">No se encontraron recetas.</p>
                    </div>
                ) : (
                    visibleGroups.map(group => (
                        <div key={group.cat} className="space-y-2">
                            {/* Header only in "all" mode; a single active chip already labels the list. */}
                            {effectiveCategory === 'all' && (
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                                  {group.label} ({group.recipes.length})
                              </p>
                            )}
                            {group.recipes.map(recipe => (
                                <div key={recipe.id} onClick={() => handleToggleRecipe(recipe.id)} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 border">
                                    <Checkbox
                                         checked={selectedRecipeIds.has(recipe.id)}
                                         onCheckedChange={() => handleToggleRecipe(recipe.id)}
                                         onClick={(e) => e.stopPropagation()}
                                         className="h-5 w-5"
                                     />
                                    <div className="flex-1 min-w-0">
                                       <RecipeCard recipe={recipe} isListView onClick={() => {}} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave}>Añadir Seleccionadas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
