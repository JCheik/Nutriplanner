'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import type { Meal, Recipe } from '@/lib/types';
import { normalizeText, cn } from '@/lib/utils';
import { RecipeCard } from './recipe-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RecipeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meal: Meal;
  allRecipes: Recipe[];
  onSave: (selectedRecipes: Recipe[]) => void;
}

export function RecipeSelectionDialog({ isOpen, onClose, meal, allRecipes, onSave }: RecipeSelectionDialogProps) {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (isOpen) {
      // We only manage newly selected recipes
      setSelectedRecipeIds(new Set());
    }
  }, [isOpen, meal]);

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

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    const existingRecipeIdsInMeal = new Set(meal.recipes.map(r => r.id));

    return allRecipes.filter(recipe => {
        if (existingRecipeIdsInMeal.has(recipe.id)) return false; // Don't show recipes already in the meal
        const nameMatch = normalizeText(recipe.name).includes(normalizedQuery);
        return nameMatch;
    });
  }, [searchQuery, allRecipes, activeTab, meal.recipes]);

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

        <ScrollArea className="flex-1 -mx-6">
            <div className="px-6 space-y-2">
                {filteredRecipes.map(recipe => (
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
