'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Recipe } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface CookingModeDialogProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CookingModeDialog({ recipe, isOpen, onClose }: CookingModeDialogProps) {
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Wake Lock API to prevent screen from sleeping
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
      }
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
      } catch (err) {
        console.warn('Wake Lock release error:', err);
      }
    }
  }, [wakeLock]);

  useEffect(() => {
    if (isOpen) {
      requestWakeLock();
      // Reset state when opening
      setCheckedIngredients(new Set());
      setCompletedSteps(new Set());
    } else {
      releaseWakeLock();
    }

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOpen) {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isOpen, requestWakeLock, releaseWakeLock]);


  if (!recipe) return null;

  // Split instructions into an array of steps
  const steps = recipe.instructions.split('\n').filter(step => step.trim().length > 0);

  const toggleIngredient = (id: string) => {
    const next = new Set(checkedIngredients);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedIngredients(next);
  };

  const toggleStep = (index: number) => {
    const next = new Set(completedSteps);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCompletedSteps(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[95vh] p-0 flex flex-col bg-background overflow-hidden rounded-xl border-2 border-primary/20">
        <div className="bg-primary/10 p-4 sm:p-6 flex items-center justify-between border-b">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-full">
              <ChefHat className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <DialogTitle className="text-2xl sm:text-4xl font-headline leading-tight">
                {recipe.name}
              </DialogTitle>
              <DialogDescription className="text-base sm:text-lg mt-1 hidden sm:block">
                Modo Cocinar Activo - La pantalla no se apagará
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-black/10">
            <X className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-12 pb-24">
            
            {/* Ingredients Section */}
            <section>
              <h3 className="text-xl sm:text-3xl font-semibold mb-6 flex items-center gap-2 text-primary">
                Ingredientes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recipe.ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
                      checkedIngredients.has(ing.id)
                        ? "bg-muted border-muted text-muted-foreground opacity-60"
                        : "bg-card border-border hover:border-primary/50 shadow-sm"
                    )}
                  >
                    <Checkbox
                      checked={checkedIngredients.has(ing.id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleIngredient(ing.id)}
                      className="h-6 w-6 sm:h-8 sm:w-8 rounded-md"
                    />
                    <div className="flex flex-col">
                      <span className={cn("text-lg sm:text-xl font-medium", checkedIngredients.has(ing.id) && "line-through")}>
                        {ing.name}
                      </span>
                      <span className="text-sm sm:text-base opacity-80">
                        {ing.quantity} {ing.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Instructions Section */}
            <section>
              <h3 className="text-xl sm:text-3xl font-semibold mb-6 flex items-center gap-2 text-primary">
                Pasos de Preparación
              </h3>
              <div className="space-y-4">
                {steps.map((step, index) => {
                  // Remove numbering if it exists (e.g. "1. Step") to display a clean checklist
                  const cleanStep = step.replace(/^\d+[.)]\s*/, '');
                  const isDone = completedSteps.has(index);

                  return (
                    <div
                      key={index}
                      onClick={() => toggleStep(index)}
                      className={cn(
                        "flex gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden",
                        isDone
                          ? "bg-muted border-muted text-muted-foreground opacity-60"
                          : "bg-card border-border hover:border-primary/50 shadow-sm"
                      )}
                    >
                      <div className="pt-1">
                        <Checkbox
                          checked={isDone}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleStep(index)}
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm sm:text-base font-bold text-primary/60 mb-1">
                          PASO {index + 1}
                        </div>
                        <p className={cn(
                          "text-lg sm:text-2xl leading-relaxed",
                          isDone && "line-through"
                        )}>
                          {cleanStep}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
