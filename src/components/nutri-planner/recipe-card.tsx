'use client';

import { useState, type DragEvent } from 'react';
import type { Recipe } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GripVertical, Flame, EggFried, Wheat, Droplets, UtensilsCrossed, Users } from 'lucide-react';
import Image from 'next/image';
import { dragStore } from '@/lib/drag-store';
import { perServingMacros } from '@/lib/serving-utils';

interface RecipeCardProps {
  recipe: Recipe;
  isDraggable?: boolean;
  isCompact?: boolean;
  isListView?: boolean;
  isMobile?: boolean;
  onClick?: () => void;
  className?: string;
}

const RecipePlaceholder = ({ recipeName, className }: { recipeName: string, className?: string }) => (
  <div className={cn(
    "w-full h-full flex items-center justify-center p-2 rounded-md bg-secondary/50",
    "cursor-pointer"
  )}>
    <span className={cn(
      "text-center font-semibold text-secondary-foreground text-sm leading-tight",
      className
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


export function RecipeCard({ recipe, isDraggable = false, isCompact = false, isListView = false, isMobile = false, onClick, className }: RecipeCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Cards always show PER-SERVING values: a 4-serving recipe used to display the
  // calories of the whole batch, which made plans impossible to reason about.
  const perServing = perServingMacros(recipe);
  const isMultiServing = perServing.servings > 1;

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    e.dataTransfer.setData('application/json', JSON.stringify(recipe));
    dragStore.setDraggedRecipe(recipe);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    dragStore.setDraggedRecipe(null);
    setIsDragging(false);
  };

  if (isListView) {
    return (
      <Card
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onClick}
        className={cn(
            "group relative w-full overflow-hidden transition-shadow hover:shadow-lg bg-background border",
            isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
            isDragging && "opacity-50"
        )}
      >
        <div className="flex items-center">
          {isDraggable && (
             <div className="hidden lg:flex items-center justify-center self-stretch px-2 cursor-grab active:cursor-grabbing text-muted-foreground bg-secondary/50">
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 p-3 pr-10 min-w-0">
            <h3 className="font-bold text-sm line-clamp-1 font-headline">{recipe.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{recipe.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 items-center text-muted-foreground">
                <MacroItem icon={Flame} value={perServing.calories} unit="kcal" colorClass="text-orange-400" />
                <MacroItem icon={EggFried} value={perServing.protein} unit="g" colorClass="text-amber-400" />
                <MacroItem icon={Wheat} value={perServing.carbs} unit="g" colorClass="text-yellow-400" />
                <MacroItem icon={Droplets} value={perServing.fat} unit="g" colorClass="text-sky-400" />
                {isMultiServing && (
                  <span className="flex items-center gap-1 text-[10px]">
                    <Users className="h-3 w-3" />
                    por ración · rinde {perServing.servings}
                  </span>
                )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (isCompact) {
    return (
      <div className="w-full h-full" onClick={onClick}>
        <RecipePlaceholder recipeName={recipe.name} className={className} />
      </div>
    );
  }
  
  return (
    <Card
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={cn(
        "group relative w-full h-full overflow-hidden transition-shadow hover:shadow-lg flex flex-col bg-card",
        isDraggable && "cursor-grab active:cursor-grabbing",
        !isDraggable && !isCompact && "cursor-pointer",
        isDragging && "opacity-50"
      )}
    >
        {isDraggable && (
          <div className="absolute top-2 left-2 z-10 p-1 bg-card/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className={cn("relative w-full flex-shrink-0", isMobile ? "aspect-[3/2]" : "aspect-[4/3]")}>
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
                /* No image: show a neutral icon, NOT the recipe name — the name is
                   already the <h3> below, so repeating it here looked duplicated. */
                <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <UtensilsCrossed className="h-8 w-8 text-secondary-foreground/25" />
                </div>
            )}
        </div>
        <div className={cn("flex-1 flex flex-col", isMobile ? "p-2.5 gap-1.5" : "p-2 justify-center")}>
             <h3 className={cn(
                "font-headline text-foreground text-center",
                isMobile ? "text-sm leading-snug line-clamp-2" : "text-base leading-tight",
                className,
             )}>{recipe.name}</h3>
            {isMobile ? (
                /* On the narrow mobile grid card, two large, legible macros beat four
                   cramped ones. The full breakdown lives in the recipe detail view. */
                <div className="mt-auto space-y-0.5">
                    <div className="flex justify-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Flame className="h-4 w-4 text-orange-400" />
                            <span className="text-sm font-semibold">{Math.round(perServing.calories)}<span className="text-muted-foreground text-xs font-normal"> kcal</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <EggFried className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-semibold">{Math.round(perServing.protein)}<span className="text-muted-foreground text-xs font-normal">g</span></span>
                        </div>
                    </div>
                    {isMultiServing && (
                        <p className="text-center text-[10px] text-muted-foreground">por ración · rinde {perServing.servings}</p>
                    )}
                </div>
            ) : (
                <>
                <div className="mt-2 flex justify-around text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-400" />
                        <span className="text-xs font-medium">{Math.round(perServing.calories)}<span className="text-muted-foreground text-[10px]">kcal</span></span>
                    </div>
                    <div className="flex items-center gap-1">
                        <EggFried className="h-3 w-3 text-amber-400" />
                        <span className="text-xs font-medium">{Math.round(perServing.protein)}<span className="text-muted-foreground text-[10px]">g</span></span>
                    </div>
                     <div className="flex items-center gap-1">
                        <Wheat className="h-3 w-3 text-yellow-400" />
                        <span className="text-xs font-medium">{Math.round(perServing.carbs)}<span className="text-muted-foreground text-[10px]">g</span></span>
                    </div>
                     <div className="flex items-center gap-1">
                        <Droplets className="h-3 w-3 text-sky-400" />
                        <span className="text-xs font-medium">{Math.round(perServing.fat)}<span className="text-muted-foreground text-[10px]">g</span></span>
                    </div>
                </div>
                {isMultiServing && (
                    <p className="text-center text-[9px] text-muted-foreground mt-0.5">por ración · rinde {perServing.servings}</p>
                )}
                </>
            )}
        </div>
    </Card>
  );
}