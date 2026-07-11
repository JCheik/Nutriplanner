'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, BookHeart, Target, Wand2, Check, Calculator, NotebookPen, type LucideIcon } from 'lucide-react';
import { useOnboardingFlag } from '@/hooks/use-onboarding';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { CalculatorDialog } from './calculator-dialog';

interface Slide {
  icon: LucideIcon;
  title: string;
  text: string;
}

// The goal step is handled specially (step 0); these are the "tour" slides that
// follow once the user has set — or skipped — their goal.
const TOUR_SLIDES: Slide[] = [
  {
    icon: CalendarDays,
    title: 'Tu plan semanal',
    text: 'Organiza tus comidas añadiendo recetas a cada día. El plan ajusta las porciones a tu objetivo, así que cada persona ve su propia cantidad.',
  },
  {
    icon: BookHeart,
    title: 'Recetas y productos',
    text: 'Guarda tus recetas, explora el recetario de Nutrilp y añade productos del súper escaneando su código de barras.',
  },
  {
    icon: NotebookPen,
    title: 'Marca lo que comes',
    text: 'Ve marcando cada comida como «comida» y en Perfil verás tu progreso: peso y calorías día a día.',
  },
  {
    icon: Wand2,
    title: 'Asistente con IA',
    text: 'Háblale o escríbele: crea recetas, rellena tu plan o resuelve dudas de nutrición. Un único asistente, también por voz.',
  },
];

// step 0 = goal, steps 1..N = TOUR_SLIDES[step-1], last step index = TOUR_SLIDES.length
const LAST_STEP = TOUR_SLIDES.length;
const TOTAL_DOTS = TOUR_SLIDES.length + 1;

export function WelcomeGuide() {
  const { shouldShow, dismiss, dismissForever } = useOnboardingFlag('welcome');
  const { currentCalorieResult, activeGoal, handleCalorieResultSave } = useUserProfileState();
  const [step, setStep] = useState(0);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  if (!shouldShow) return null;

  const hasGoal = !!currentCalorieResult;
  const isGoalStep = step === 0;
  const isLast = step === LAST_STEP;
  const tourSlide = !isGoalStep ? TOUR_SLIDES[step - 1] : null;
  const TourIcon = tourSlide?.icon;

  return (
    <>
      <Dialog open={shouldShow} onOpenChange={(open) => { if (!open) dismiss(); }}>
        <DialogContent className="max-w-md bg-glass">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              {isGoalStep
                ? <Target className="h-7 w-7 text-primary" />
                : TourIcon && <TourIcon className="h-7 w-7 text-primary" />}
            </div>
            {isGoalStep ? (
              <>
                <DialogTitle className="text-center text-xl">
                  {hasGoal ? '¡Tu objetivo está listo!' : 'Empecemos por tu objetivo'}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {hasGoal
                    ? 'Ya tienes tus calorías y macros calculados. Puedes recalcularlos cuando quieras desde Perfil.'
                    : 'Calcula tus calorías y macros diarios. El resto de la app se adapta a este objetivo, así que es el mejor primer paso.'}
                </DialogDescription>
              </>
            ) : tourSlide && (
              <>
                <DialogTitle className="text-center text-xl">{tourSlide.title}</DialogTitle>
                <DialogDescription className="text-center">{tourSlide.text}</DialogDescription>
              </>
            )}
          </DialogHeader>

          {/* Goal step CTA */}
          {isGoalStep && (
            <div className="flex flex-col items-center gap-2 py-1">
              {hasGoal ? (
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  <Check className="h-4 w-4" />
                  {Math.round(currentCalorieResult![activeGoal]?.calories ?? currentCalorieResult!.maintenance.calories)} kcal/día
                </div>
              ) : (
                <Button className="w-full" onClick={() => setIsCalculatorOpen(true)}>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular mi objetivo
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-center gap-1.5 py-2">
            {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-muted'}`}
              />
            ))}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex w-full gap-2">
              {step > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                  Atrás
                </Button>
              )}
              {isLast ? (
                <Button className="flex-1" onClick={() => dismissForever()}>
                  Empezar
                </Button>
              ) : (
                <Button className="flex-1" onClick={() => setStep(step + 1)}>
                  {isGoalStep && !hasGoal ? 'Lo haré luego' : 'Siguiente'}
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => dismissForever()}>
              Saltar introducción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* The real calculator, reused. On save we advance past the goal step. */}
      <CalculatorDialog
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onCalculate={(result) => {
          handleCalorieResultSave(result);
          setIsCalculatorOpen(false);
          setStep(1);
        }}
        initialResult={currentCalorieResult}
        activeGoal={activeGoal}
      />
    </>
  );
}
