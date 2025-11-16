'use client';

import { useState } from 'react';
import type { Recipe } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { Edit } from 'lucide-react';

interface AiSuggestionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedRecipes: Recipe[];
  onAddSelected: (selectedRecipes: Recipe[]) => void;
  onEdit: (recipe: Recipe) => void;
}

export function AiSuggestionsDialog({ isOpen, onClose, suggestedRecipes, onAddSelected, onEdit }: AiSuggestionsDialogProps) {
  const [selectedRecipes, setSelectedRecipes] = useState<Record<string, boolean>>({});

  const handleToggleSelect = (recipeId: string) => {
    setSelectedRecipes(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId],
    }));
  };

  const handleAddClick = () => {
    const recipesToAdd = suggestedRecipes.filter(recipe => selectedRecipes[recipe.id]);
    onAddSelected(recipesToAdd);
    setSelectedRecipes({});
  };

  const selectedCount = Object.values(selectedRecipes).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setSelectedRecipes({});
      }
    }}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Sugerencias de la IA</DialogTitle>
          <DialogDescription>
            Hemos creado estas recetas para ti. Selecciona las que quieras añadir a tu biblioteca.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow h-full">
          <div className="space-y-4 pr-6">
            {suggestedRecipes.map((recipe) => (
              <Card key={recipe.id} className="flex items-center gap-4 overflow-hidden relative">
                <div className="absolute top-3 left-3 z-10">
                    <Checkbox
                        id={`select-${recipe.id}`}
                        checked={!!selectedRecipes[recipe.id]}
                        onCheckedChange={() => handleToggleSelect(recipe.id)}
                        className="bg-white/80 border-slate-500 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground w-5 h-5"
                    />
                </div>
                <div className="relative w-32 h-32 shrink-0">
                  <Image
                    src={recipe.imageUrl || `https://picsum.photos/seed/${recipe.id}/300/300`}
                    alt={recipe.name}
                    fill
                    sizes="128px"
                    className="object-cover"
                    data-ai-hint="food meal"
                  />
                </div>
                <div className="py-4 pr-4 flex-1">
                  <CardHeader className="p-0 mb-2">
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{recipe.description}</p>
                    <details className="text-xs">
                        <summary className="cursor-pointer font-semibold">Ver detalles</summary>
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
                 <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => onEdit(recipe)}>
                    <Edit className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAddClick} disabled={selectedCount === 0}>
            Añadir {selectedCount > 0 ? `${selectedCount} ` : ''}a la biblioteca
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
