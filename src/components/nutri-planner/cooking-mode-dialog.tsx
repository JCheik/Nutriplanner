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
import { X, ChefHat, Video, Timer, Play, Pause, RotateCcw, BellRing, Minus, Plus } from 'lucide-react';
import { cn, pluralizeUnit } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { splitInstructionSteps, parseStepDurations } from '@/lib/recipe-steps';

const MAX_SERVINGS = 30;

/** Scales a batch quantity to the chosen servings and formats it cleanly:
 *  integers stay integers, otherwise one decimal (62.5 g, not 62.4999). */
function formatScaledQuantity(quantity: number, factor: number): string {
  const scaled = quantity * factor;
  if (!Number.isFinite(scaled)) return String(quantity);
  const rounded = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
  return String(rounded);
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Short beep sequence + vibration when a step timer finishes. */
function playTimerAlarm() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      const ctx = new Ctor();
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        const t = ctx.currentTime + i * 0.4;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.35);
      }
      setTimeout(() => { ctx.close().catch(() => {}); }, 2500);
    }
  } catch { /* audio unavailable */ }
  try { navigator.vibrate?.([300, 150, 300, 150, 300]); } catch { /* no vibration */ }
}

type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

/**
 * Inline countdown for a duration detected in a step ("hornea 20 minutos").
 * Self-contained: start / pause / resume / reset, with an audible + vibrating
 * alarm on finish. Rendered inside the clickable step card, so every handler
 * stops propagation to avoid toggling the step's checkbox.
 */
function StepTimer({ seconds, label }: { seconds: number; label: string }) {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [remaining, setRemaining] = useState(seconds);
  const endAtRef = useRef<number>(0);

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setStatus('done');
        playTimerAlarm();
      }
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  const start = () => {
    endAtRef.current = Date.now() + remaining * 1000;
    setStatus('running');
  };
  const reset = () => {
    setStatus('idle');
    setRemaining(seconds);
  };

  const roundBtn = 'h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 transition-colors';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border-2 pl-3 pr-1.5 py-1',
        status === 'done'
          ? 'border-primary bg-primary text-primary-foreground animate-pulse'
          : status === 'running'
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card'
      )}
    >
      {status === 'done' ? (
        <BellRing className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
      ) : (
        <Timer className={cn('h-4 w-4 sm:h-5 sm:w-5 shrink-0', status === 'running' && 'text-primary')} />
      )}
      {status === 'idle' ? (
        <span className="text-sm sm:text-base font-medium whitespace-nowrap">{label}</span>
      ) : status === 'done' ? (
        <span className="text-sm sm:text-base font-bold whitespace-nowrap">¡Tiempo!</span>
      ) : (
        <span className={cn('text-base sm:text-lg font-bold tabular-nums', status === 'running' && 'text-primary')}>
          {formatCountdown(remaining)}
        </span>
      )}
      {(status === 'idle' || status === 'paused') && (
        <button type="button" onClick={start} aria-label="Iniciar temporizador"
          className={cn(roundBtn, 'bg-primary text-primary-foreground hover:bg-primary/90')}>
          <Play className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}
      {status === 'running' && (
        <button type="button" onClick={() => setStatus('paused')} aria-label="Pausar temporizador"
          className={cn(roundBtn, 'bg-primary text-primary-foreground hover:bg-primary/90')}>
          <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}
      {status !== 'idle' && (
        <button type="button" onClick={reset} aria-label="Reiniciar temporizador"
          className={cn(roundBtn, status === 'done' ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' : 'bg-muted hover:bg-muted-foreground/20')}>
          <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}
    </div>
  );
}

interface CookingModeDialogProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CookingModeDialog({ recipe, isOpen, onClose }: CookingModeDialogProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  // How many servings the user is actually cooking now. Defaults to what the
  // recipe yields (so batch recipes and the written steps still match), but can
  // be dropped to 1 when you only want a single portion.
  const [servingsToMake, setServingsToMake] = useState(1);

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
    // Start from what the recipe yields; the written steps assume that amount.
    setServingsToMake(recipe?.servings && recipe.servings > 0 ? recipe.servings : 1);

    // Re-acquire the lock when the tab becomes visible again.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isOpen, recipe?.servings, requestWakeLock, releaseWakeLock]);

  if (!recipe) return null;

  // Robust split: handles newline-separated, inline-numbered and single-block
  // instructions (AI recipes don't always use line breaks).
  const steps = splitInstructionSteps(recipe.instructions);

  const recipeServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
  const scaleFactor = servingsToMake / recipeServings;

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
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h3 className="text-xl sm:text-3xl font-semibold flex items-center gap-2 text-primary">
                  Ingredientes
                </h3>
                {/* Serving selector: scales the quantities below. Handy for batch
                    recipes — drop it to 1 to cook a single portion. */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-sm sm:text-base text-muted-foreground">Raciones a preparar</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setServingsToMake((s) => Math.max(1, s - 1))}
                      disabled={servingsToMake <= 1}
                      aria-label="Una ración menos"
                      className="h-9 w-9 sm:h-11 sm:w-11 rounded-full"
                    >
                      <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <span className="text-xl sm:text-2xl font-bold tabular-nums w-8 text-center">{servingsToMake}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setServingsToMake((s) => Math.min(MAX_SERVINGS, s + 1))}
                      disabled={servingsToMake >= MAX_SERVINGS}
                      aria-label="Una ración más"
                      className="h-9 w-9 sm:h-11 sm:w-11 rounded-full"
                    >
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                </div>
              </div>
              {servingsToMake !== recipeServings && (
                <p className="text-sm text-muted-foreground -mt-3 mb-5">
                  Cantidades ajustadas a {servingsToMake} {servingsToMake === 1 ? 'ración' : 'raciones'} · la receta rinde {recipeServings}.
                  Los pasos describen la receta completa.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recipe.ingredients.map((ing) => {
                  const isPiece = ing.unit && !['g', 'ml'].includes(ing.unit.toLowerCase());
                  const scaledQty = formatScaledQuantity(ing.quantity, scaleFactor);
                  return (
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
                          {scaledQty} {isPiece ? pluralizeUnit(ing.unit, Number(scaledQty)) : ing.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                  const durations = parseStepDurations(step);

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
                        {/* Timers stay mounted even when the step is checked off —
                            you often mark "meter al horno" as done right when its
                            countdown starts. */}
                        {durations.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {durations.map((d, i) => (
                              <StepTimer key={`${index}-${i}-${d.seconds}`} seconds={d.seconds} label={d.label} />
                            ))}
                          </div>
                        )}
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
