'use client';

import type { DragEvent } from 'react';
import type { Recipe } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GripVertical, Flame, EggFried, Wheat, Droplets } from 'lucide-react';
import Image from 'next/image';

interface RecipeCardProps {
  recipe: Recipe;
  isDraggable?: boolean;
  isCompact?: boolean;
  isListView?: boolean;
  onClick?: () => void;
}

const RecipePlaceholder = ({ recipeName }: { recipeName: string }) => (
  <div className={cn(
    "w-full h-full flex items-center justify-center p-2 rounded-md bg-secondary/50"
  )}>
    <span className={cn(
      "text-center font-semibold text-secondary-foreground text-sm leading-tight line-clamp-3 break-words",
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
        className={cn(
            "group relative w-full overflow-hidden transition-shadow hover:shadow-lg bg-background border",
            isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        )}
      >
        <div className="flex items-center">
          {isDraggable && (
             <div className="hidden lg:flex items-center justify-center self-stretch px-2 cursor-grab active:cursor-grabbing text-muted-foreground bg-secondary/50">
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 p-3">
            <h3 className="font-bold text-sm line-clamp-1 font-headline">{recipe.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{recipe.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 items-center text-muted-foreground">
                <MacroItem icon={Flame} value={recipe.calories} unit="kcal" colorClass="text-orange-400" />
                <MacroItem icon={EggFried} value={recipe.protein} unit="g" colorClass="text-amber-400" />
                <MacroItem icon={Wheat} value={recipe.carbs} unit="g" colorClass="text-yellow-400" />
                <MacroItem icon={Droplets} value={recipe.fat} unit="g" colorClass="text-sky-400" />
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
           <RecipePlaceholder recipeName={recipe.name} />
        </div>
    );
  }
  
  return (
    <Card
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        "group relative w-full h-full overflow-hidden transition-shadow hover:shadow-lg flex flex-col bg-card",
        isDraggable && "cursor-grab active:cursor-grabbing",
        !isDraggable && !isCompact && "cursor-pointer"
      )}
    >
        {isDraggable && (
          <div className="absolute top-2 left-2 z-10 p-1 bg-card/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="relative w-full aspect-[4/3] flex-shrink-0">
            {recipe.imageUrl ? (
                <Image
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover"
                    data-ai-hint={recipe.imageHint}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center p-2 bg-secondary">
                    <span className="text-center font-headline text-lg leading-tight line-clamp-3 text-secondary-foreground">
                        {recipe.name}
                    </span>
                </div>
            )}
        </div>
        <div className="p-2 flex-1 flex flex-col justify-center">
             <h3 className="font-headline text-base line-clamp-1 leading-tight text-foreground">{recipe.name}</h3>
            <div className="mt-2 flex justify-around text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-400" />
                    <span className="text-xs font-medium">{Math.round(recipe.calories)}<span className="text-muted-foreground text-[10px]">kcal</span></span>
                </div>
                <div className="flex items-center gap-1">
                    <EggFried className="h-3 w-3 text-amber-400" />
                    <span className="text-xs font-medium">{Math.round(recipe.protein)}<span className="text-muted-foreground text-[10px]">g</span></span>
                </div>
                 <div className="flex items-center gap-1">
                    <Wheat className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs font-medium">{Math.round(recipe.carbs)}<span className="text-muted-foreground text-[10px]">g</span></span>
                </div>
                 <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-sky-400" />
                    <span className="text-xs font-medium">{Math.round(recipe.fat)}<span className="text-muted-foreground text-[10px]">g</span></span>
                </div>
            </div>
        </div>
    </Card>
  );
}
