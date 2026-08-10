'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import type { Meal, Recipe, DietTag, SortCriteria } from '@/lib/types';
import { DIET_TAGS, DIET_TAG_LABELS } from '@/lib/constants';
import { RECIPE_SORT_OPTIONS, compareRecipes } from '@/lib/recipe-sort';
import { normalizeText, cn } from '@/lib/utils';
import { RecipeCard } from './recipe-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  /**
   * Recetas separadas por origen (antes llegaban ya mezcladas en `allRecipes`).
   * Hacía falta distinguirlas para poder ofrecer "Mis recetas": sin ese filtro,
   * la única forma de planificar una receta propia era cerrar este diálogo, ir a
   * la biblioteca y usar "Añadir al plan" — cuatro pasos para algo que ya estaba
   * aquí, solo que perdido entre las 130 del recetario.
   */
  userRecipes: Recipe[];
  nutriplannerRecipes: Recipe[];
  onSave: (selectedRecipes: Recipe[]) => void;
  /** The user's saved diet preference; drives the optional diet filter. */
  dietPreference?: DietTag[];
}

/** Origen de las recetas que se listan. */
type RecipeSource = 'all' | 'mine' | 'nutrilp';

/**
 * Valor del filtro de dieta: cualquiera, la dieta guardada del perfil, o una
 * etiqueta concreta elegida a mano.
 */
type DietFilter = 'any' | 'preference' | DietTag;

export function RecipeSelectionDialog({ isOpen, onClose, meal, userRecipes, nutriplannerRecipes, onSave, dietPreference = [] }: RecipeSelectionDialogProps) {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  // 'all' shows every category grouped; a specific category narrows the list so
  // the user doesn't have to scroll past 100 recipes to reach e.g. "Cenas".
  const [activeCategory, setActiveCategory] = useState<SmartCategory | 'all'>('all');
  const [source, setSource] = useState<RecipeSource>('all');
  // Arranca en la dieta guardada (si la hay), pero ahora se puede elegir
  // cualquier otra: antes esto era un sí/no atado a la preferencia del perfil,
  // así que quien no tuviera dieta guardada no tenía forma de buscar, por
  // ejemplo, algo vegetariano suelto.
  const [dietFilter, setDietFilter] = useState<DietFilter>(dietPreference.length > 0 ? 'preference' : 'any');
  // Same options as the recipe library (macros are per serving).
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('name-asc');

  const hasDietPref = dietPreference.length > 0;
  const dietLabel = dietPreference.map((d) => DIET_TAG_LABELS[d] ?? d).join(', ');

  const allRecipes = useMemo(() => [...userRecipes, ...nutriplannerRecipes], [userRecipes, nutriplannerRecipes]);
  const mineIds = useMemo(() => new Set(userRecipes.map((r) => r.id)), [userRecipes]);

  useEffect(() => {
    if (isOpen) {
      setSelectedRecipeIds(new Set());
      setSearchQuery('');
      setActiveCategory('all');
      setSource('all');
      setDietFilter(hasDietPref ? 'preference' : 'any');
      setSortCriteria('name-asc');
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

      if (source === 'mine' && !mineIds.has(recipe.id)) return false;
      if (source === 'nutrilp' && mineIds.has(recipe.id)) return false;

      const tags = recipe.dietTags ?? [];
      if (dietFilter === 'preference' && hasDietPref) {
        // Same semantics as the library: untagged recipes are wildcards;
        // otherwise the recipe must share at least one tag with the diet.
        if (tags.length > 0 && !dietPreference.some(d => tags.includes(d))) return false;
      } else if (dietFilter !== 'preference' && dietFilter !== 'any') {
        // Dieta elegida a mano: aquí SÍ se exige la etiqueta, sin comodines. Con
        // la regla de "sin etiquetar vale para todo" el filtro no filtraría
        // nada —la mayoría del recetario no lleva etiqueta—, que es justo lo
        // contrario de lo que se pide al buscar "vegetariana".
        if (!tags.includes(dietFilter)) return false;
      }
      return true;
    }).sort(compareRecipes(sortCriteria));
  }, [searchQuery, allRecipes, meal.recipes, dietFilter, hasDietPref, dietPreference, sortCriteria, source, mineIds]);

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

        {/* Compact controls: origen / categoría / dieta / orden as dropdowns
            instead of rows of chips (the old inline sort menu also misbehaved
            inside this dialog — Select is the pattern that works in dialogs).
            Dos filas de dos: cuatro en una sola dejaban los textos ilegibles. */}
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recetario</p>
            <Select value={source} onValueChange={(v) => setSource(v as RecipeSource)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-glass">
                <SelectItem value="all">Todas ({allRecipes.length})</SelectItem>
                <SelectItem value="mine">Mis recetas ({userRecipes.length})</SelectItem>
                <SelectItem value="nutrilp">Recetario Nutrilp ({nutriplannerRecipes.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Categoría</p>
            <Select value={effectiveCategory} onValueChange={(v) => setActiveCategory(v as SmartCategory | 'all')}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-glass">
                <SelectItem value="all">Todas ({filteredRecipes.length})</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.cat} value={g.cat}>
                    {g.label} ({g.recipes.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Dieta</p>
            <Select value={dietFilter} onValueChange={(v) => setDietFilter(v as DietFilter)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-glass">
                <SelectItem value="any">Cualquier dieta</SelectItem>
                {hasDietPref && <SelectItem value="preference">La mía ({dietLabel})</SelectItem>}
                {DIET_TAGS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Ordenar por</p>
            <Select value={sortCriteria} onValueChange={(v) => setSortCriteria(v as SortCriteria)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-glass">
                {RECIPE_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-6">
            <div className="px-6 space-y-4">
                {visibleGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
                        <Search className="h-8 w-8 mb-2 text-muted-foreground/50" />
                        <p className="text-sm">No hay recetas con estos filtros.</p>
                        <p className="text-xs mt-1">Prueba a poner el recetario en &quot;Todas&quot; o la dieta en &quot;Cualquier dieta&quot;.</p>
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
