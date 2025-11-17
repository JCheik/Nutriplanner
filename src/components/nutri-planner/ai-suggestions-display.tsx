'use client';

import { useState } from 'react';
import type { Recipe } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, RefreshCw } from 'lucide-react';

interface AiSuggestionsDisplayProps {
  suggestedRecipes: Recipe[];
  onAddSelected: (selectedRecipes: Recipe[]) => void;
  onEdit: (recipe: Recipe) => void;
  onClear: () => void;
}

export function AiSuggestionsDisplay({ suggestedRecipes, onAddSelected, onEdit, onClear }: AiSuggestionsDisplayProps) {
  const [selectedRecipes, setSelectedRecipes] = useState<Record<string, boolean>>(() => {
    // By default, all recipes are selected
    return suggestedRecipes.reduce((acc, recipe) => {
      acc[recipe.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
  });

  const handleToggleSelect = (recipeId: string) => {
    setSelectedRecipes(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId],
    }));
  };

  const handleAddClick = () => {
    const recipesToAdd = suggestedRecipes.filter(recipe => selectedRecipes[recipe.id]);
    onAddSelected(recipesToAdd);
  };
  
  const handleEditClick = (recipe: Recipe) => {
    onEdit(recipe);
  }

  const selectedCount = Object.values(selectedRecipes).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
        <ScrollArea className="flex-grow -mx-6 px-6">
            <div className="space-y-4">
                {suggestedRecipes.map((recipe) => (
                <Card key={recipe.id} className="flex items-start gap-4 overflow-hidden relative group">
                    <div className="p-4">
                        <Checkbox
                            id={`select-${recipe.id}`}
                            checked={!!selectedRecipes[recipe.id]}
                            onCheckedChange={() => handleToggleSelect(recipe.id)}
                            className="w-5 h-5"
                        />
                    </div>
                    <div className="py-4 pr-4 flex-1">
                    <CardHeader className="p-0 mb-2">
                        <CardTitle className="text-lg">{recipe.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{recipe.description}</p>
                        <details className="text-xs">
                            <summary className="cursor-pointer font-semibold text-primary">Ver detalles</summary>
                            <div className="mt-2 space-y-2">
                                <div>
                                    <h4 className="font-medium">Ingredientes:</h4>
                                    <ul className="list-disc list-inside">
                                        {recipe.ingredients.map(ing => <li key={ing.id}>{ing.quantity}{ing.unit} {ing.name}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-medium">Instrucciones:</h4>
                                    <p className="whitespace-pre-wrap">{recipe.instructions}</p>
                                </div>
                            </div>
                        </details>
                    </CardContent>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEditClick(recipe)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </Card>
                ))}
            </div>
        </ScrollArea>
        <div className="flex justify-between items-center pt-4 mt-4 border-t">
          <Button variant="outline" onClick={onClear}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Empezar de nuevo
          </Button>
          <Button onClick={handleAddClick} disabled={selectedCount === 0}>
            Añadir {selectedCount > 0 ? `${selectedCount} ` : ''}a la biblioteca
          </Button>
        </div>
    </div>
  );
}
