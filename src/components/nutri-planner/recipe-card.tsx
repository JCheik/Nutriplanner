'use client';

import type { DragEvent } from 'react';
import type { Recipe } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { NutritionTotalsTooltip } from './nutrition-totals-tooltip';

interface RecipeCardProps {
  recipe: Recipe;
  isDraggable?: boolean;
  isCompact?: boolean;
  isListView?: boolean;
  onClick?: () => void;
}

const RecipePlaceholder = ({ recipeName }: { recipeName: string }) => (
  <div className="w-full h-full bg-secondary flex items-center justify-center p-2">
    <span className="text-secondary-foreground text-center font-semibold text-sm leading-tight line-clamp-2">
      {recipeName}
    </span>
  </div>
);

export function RecipeCard({ recipe, isDraggable = false, isCompact = false, isListView = false, onClick }: RecipeCardProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    e.dataTransfer.setData('application/json', JSON.stringify(recipe));
  };

  if (isListView) {
    return (
      <Card
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onClick={onClick}
        className="group relative w-full overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
      >
        <div className="flex items-center gap-4">
          {isDraggable && (
             <div className="flex items-center justify-center pl-2 cursor-grab active:cursor-grabbing text-muted-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="relative w-24 h-16 shrink-0">
            <RecipePlaceholder recipeName={recipe.name} />
          </div>
          <div className="flex-1 pr-4 py-2">
            <h3 className="font-bold text-sm line-clamp-1">{recipe.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{recipe.description}</p>
          </div>
          <div className="pr-4">
            <NutritionTotalsTooltip totals={recipe} />
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        "group relative w-full h-full overflow-hidden transition-shadow hover:shadow-md",
        isDraggable && "cursor-grab active:cursor-grabbing",
        !isDraggable && !isCompact && "cursor-pointer"
      )}
    >
      <CardContent className="p-0 w-full h-full flex flex-col">
        {isDraggable && !isCompact && (
          <div className="absolute top-2 left-2 z-10 p-1 bg-card/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="relative w-full h-full">
            <RecipePlaceholder recipeName={recipe.name} />
        </div>
        {!isCompact && (
            <div className="absolute bottom-0 left-0 right-0 p-2 text-primary-foreground bg-black/30">
                 <h3 className="font-bold text-base line-clamp-1 leading-tight text-white">{recipe.name}</h3>
                <div className="mt-2">
                    <NutritionTotalsTooltip totals={recipe} />
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
