'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { X, ChefHat, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { splitInstructionSteps } from '@/lib/recipe-steps';

interface CookingModeDialogProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CookingModeDialog({ recipe, isOpen, onClose }: CookingModeDialogProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Keep the screen-wake lock in a ref so requesting/releasing it never feeds back
  // into React state. (Storing it in state made the effect below depend on a value
  // it set itself, re-running on every grant and wiping the checklist.)
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch (err) {
      console.warn('Wake Lock release error:', err);
    }
    wakeLockRef.current = null;
  }, []);

  // Both callbacks have stable identities, so this effect only re-runs when the
  // dialog actually opens/closes — the checklist state is reset once, on open.
  useEffect(() => {
    if (!isOpen) {
      releaseWakeLock();
      return;
    }

    requestWakeLock();
    setCheckedIngredients(new Set());
    setCompletedSteps(new Set());

    // Re-acquire the lock when the tab becomes visible again.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isOpen, requestWakeLock, releaseWakeLock]);

  if (!recipe) return null;

  // Robust split: handles newline-separated, inline-numbered and single-block
  // instructions (AI recipes don't always use line breaks).
  const steps = splitInstructionSteps(recipe.instructions);

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        className="max-w-4xl w-[95vw] h-[95vh] p-0 flex flex-col bg-background overflow-hidden rounded-xl border-2 border-primary/20"
      >
        <div className="bg-primary/10 p-4 sm:p-6 flex items-center justify-between border-b">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="bg-primary text-primary-foreground p-3 rounded-full shrink-0">
              <ChefHat className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-2xl sm:text-4xl font-headline leading-tight">
                {recipe.name}
              </DialogTitle>
              <DialogDescription className="text-base sm:text-lg mt-1 hidden sm:block">
                Modo Cocinar Activo - La pantalla no se apagará
              </DialogDescription>
              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1 text-sm sm:text-base text-primary hover:underline"
                >
                  <Video className="h-4 w-4 shrink-0" />
                  Ver vídeo / receta original
                </a>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modo cocina"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-black/10 shrink-0"
          >
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
                          {step}
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
