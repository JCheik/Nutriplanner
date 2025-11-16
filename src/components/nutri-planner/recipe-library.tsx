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
              <CardTitle>Recipe Library</CardTitle>
            </div>
            <CardDescription>Your collection of saved recipes.</CardDescription>
          </div>
          <Button onClick={() => onRecipeAction('create')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Recipe
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
                  <p className="text-muted-foreground">Your library is empty.</p>
                  <p className="text-sm text-muted-foreground">Create a recipe or use the AI suggester to get started!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
