'use client';

import type { Recipe } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecipeCard } from './recipe-card';
import { BookHeart, PlusCircle } from 'lucide-react';

interface RecipeLibraryProps {
  recipes: Recipe[];
  onRecipeAction: (action: 'view' | 'create', recipe?: Recipe) => void;
}

export function RecipeLibrary({ recipes, onRecipeAction }: RecipeLibraryProps) {
  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <BookHeart className="h-6 w-6 text-primary" />
              <CardTitle>Biblioteca de Recetas</CardTitle>
            </div>
            <CardDescription>Tu colección de recetas guardadas.</CardDescription>
          </div>
          <Button onClick={() => onRecipeAction('create')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Receta
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-4 pr-4">
            {recipes.length > 0 ? (
              recipes.map(recipe => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  isDraggable 
                  onClick={() => onRecipeAction('view', recipe)}
                />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-64">
                  <p className="text-muted-foreground">Tu biblioteca está vacía.</p>
                  <p className="text-sm text-muted-foreground">¡Crea una receta o usa el sugeridor de IA para empezar!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
