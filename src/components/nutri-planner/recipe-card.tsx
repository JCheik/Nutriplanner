'use client';

import type { DragEvent } from 'react';
import type { Recipe } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GripVertical, Flame, EggFried, Wheat, Droplets } from 'lucide-react';
import { NutritionTotalsTooltip } from './nutrition-totals-tooltip';

interface RecipeCardProps {
  recipe: Recipe;
  isDraggable?: boolean;
  isCompact?: boolean;
  isListView?: boolean;
  onClick?: () => void;
  colorVariant?: 'primary' | 'secondary';
}

const RecipePlaceholder = ({ recipeName, colorVariant = 'primary' }: { recipeName: string, colorVariant?: 'primary' | 'secondary' }) => (
  <div className={cn(
    "w-full h-full flex items-center justify-center p-2",
    colorVariant === 'primary' ? 'bg-accent' : 'bg-chart-1'
  )}>
    <span className={cn(
      "text-center font-semibold text-sm leading-tight line-clamp-2",
       colorVariant === 'primary' ? 'text-accent-foreground' : 'text-white'
    )}>
      {recipeName}
    </span>
  </div>
);

const MacroItem = ({ icon: Icon, value, unit, colorClass }: { icon: React.ElementType, value: number, unit: string, colorClass: string }) => (
    <div className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3", colorClass)} />
        <span className="text-xs font-medium">{Math.round(value)}{unit}</span>
    </div>
);


export function RecipeCard({ recipe, isDraggable = false, isCompact = false, isListView = false, onClick, colorVariant = 'primary' }: RecipeCardProps) {
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
        <div className="flex items-center">
          {isDraggable && (
             <div className="flex items-center justify-center self-stretch px-2 cursor-grab active:cursor-grabbing text-muted-foreground bg-secondary/30">
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 p-3">
            <h3 className="font-bold text-sm line-clamp-1">{recipe.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{recipe.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 items-center text-muted-foreground">
                <MacroItem icon={Flame} value={recipe.calories} unit="kcal" colorClass="text-orange-500" />
                <MacroItem icon={EggFried} value={recipe.protein} unit="g" colorClass="text-amber-600" />
                <MacroItem icon={Wheat} value={recipe.carbs} unit="g" colorClass="text-yellow-500" />
                <MacroItem icon={Droplets} value={recipe.fat} unit="g" colorClass="text-sky-500" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (isCompact) {
    return (
        <div 
          className="w-full h-full cursor-pointer"
          onClick={onClick}
        >
           <RecipePlaceholder recipeName={recipe.name} colorVariant={colorVariant} />
        </div>
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
