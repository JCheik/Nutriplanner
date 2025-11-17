'use client';

import { useState, useTransition } from 'react';
import type { SuggestRecipesInput, SuggestRecipesOutput } from '@/ai/flows/suggest-recipes';
import type { Recipe as FullRecipe } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AiSuggestionsDisplay } from './ai-suggestions-display';

interface AiSuggesterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuggest: (input: SuggestRecipesInput) => Promise<SuggestRecipesOutput>;
  onAddRecipes: (recipes: FullRecipe[]) => void;
  onEditRecipe: (recipe: FullRecipe) => void;
}

export function AiSuggesterDialog({ isOpen, onClose, onSuggest, onAddRecipes, onEditRecipe }: AiSuggesterDialogProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [preferences, setPreferences] = useState('');
  const [suggestedRecipes, setSuggestedRecipes] = useState<FullRecipe[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleAddIngredient = () => {
    if (currentIngredient && !ingredients.includes(currentIngredient)) {
      setIngredients([...ingredients, currentIngredient]);
      setCurrentIngredient('');
    }
  };

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setIngredients(ingredients.filter(ing => ing !== ingredientToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ingredients.length === 0) return;
    
    startTransition(async () => {
      try {
        const result = await onSuggest({ ingredients, preferences });
        const fullRecipes: FullRecipe[] = result.recipes.map(r => ({
          ...r,
          id: self.crypto.randomUUID(),
          ingredients: r.ingredients.map(i => ({...i, id: self.crypto.randomUUID(), calories: 0, protein: 0, carbs: 0, fat: 0 })),
        }));
        setSuggestedRecipes(fullRecipes);
      } catch (error) {
        console.error('Failed to get AI suggestions:', error);
        // Here you could show a toast to the user
      }
    });
  };

  const handleDialogClose = () => {
    onClose();
    // Reset state on close after a delay to allow for exit animation
    setTimeout(() => {
        setIngredients([]);
        setCurrentIngredient('');
        setPreferences('');
        setSuggestedRecipes([]);
    }, 300);
  }

  const handleAddSelected = (selectedRecipes: FullRecipe[]) => {
    onAddRecipes(selectedRecipes);
    handleDialogClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sugeridor de Recetas con IA</DialogTitle>
          <DialogDescription>
            Añade ingredientes y preferencias para que la IA cree recetas para ti.
          </DialogDescription>
        </DialogHeader>
        
        {suggestedRecipes.length === 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col flex-1 pt-4">
            <div>
              <Label htmlFor="ingredients">Ingredientes Disponibles</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="ingredients"
                  placeholder="ej., pechuga de pollo, tomates"
                  value={currentIngredient}
                  onChange={(e) => setCurrentIngredient(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIngredient(); } }}
                />
                <Button type="button" onClick={handleAddIngredient}>Añadir</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 min-h-[6rem] p-2 rounded-md border border-input bg-background">
                {ingredients.map((ing) => (
                  <Badge key={ing} variant="secondary" className="pl-3 pr-1 text-base">
                    {ing}
                    <button onClick={() => handleRemoveIngredient(ing)} className="ml-2 rounded-full hover:bg-muted p-0.5">
                      <X className="h-4 w-4" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="preferences">Preferencias (opcional)</Label>
              <Input
                id="preferences"
                placeholder="ej., desayuno, vegano, bajo en carbohidratos"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex-1"></div>
            <Button type="submit" disabled={isPending || ingredients.length === 0} className="w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Obtener Sugerencias
            </Button>
          </form>
        ) : (
          <AiSuggestionsDisplay 
            suggestedRecipes={suggestedRecipes}
            onAddSelected={handleAddSelected}
            onEdit={onEditRecipe}
            onClear={() => setSuggestedRecipes([])}
          />
        )}

      </DialogContent>
    </Dialog>
  );
}
