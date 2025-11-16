'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Recipe } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

interface AiSuggesterProps {
  onSuggest: (ingredients: string[], dietaryPreferences: string) => Promise<Recipe[] | undefined>;
}

export function AiSuggester({ onSuggest }: AiSuggesterProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);

  const handleAddIngredient = () => {
    if (currentIngredient && !ingredients.includes(currentIngredient)) {
      setIngredients([...ingredients, currentIngredient]);
      setCurrentIngredient('');
    }
  };

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setIngredients(ingredients.filter(ing => ing !== ingredientToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ingredients.length === 0) return;
    setIsLoading(true);
    setSuggestedRecipes([]);
    const recipes = await onSuggest(ingredients, dietaryPreferences);
    if(recipes) {
      // For demonstration, we're not doing anything with the returned recipes here
      // as they are already added to the library in the parent component.
    }
    setIsLoading(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle>AI Recipe Suggester</CardTitle>
        </div>
        <CardDescription>Out of ideas? Let AI create recipes from what you have.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ingredients">Available Ingredients</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="ingredients"
                placeholder="e.g., chicken breast, tomatoes"
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIngredient(); } }}
              />
              <Button type="button" onClick={handleAddIngredient}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {ingredients.map((ing) => (
                <Badge key={ing} variant="secondary" className="pl-3 pr-1">
                  {ing}
                  <button onClick={() => handleRemoveIngredient(ing)} className="ml-1 rounded-full hover:bg-muted p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="dietary">Dietary Preferences (optional)</Label>
            <Input
              id="dietary"
              placeholder="e.g., vegetarian, gluten-free"
              value={dietaryPreferences}
              onChange={(e) => setDietaryPreferences(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button type="submit" disabled={isLoading || ingredients.length === 0} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Suggest Recipes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
