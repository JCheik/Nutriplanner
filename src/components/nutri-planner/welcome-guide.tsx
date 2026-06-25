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
import { CalendarDays, BookHeart, Target, Wand2, type LucideIcon } from 'lucide-react';
import { useOnboardingFlag } from '@/hooks/use-onboarding';

interface Slide {
  icon: LucideIcon;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: CalendarDays,
    title: 'Tu plan semanal',
    text: 'Organiza tus comidas arrastrando recetas a cada día. Cada hueco tiene un tipo de comida que guía las sugerencias.',
  },
  {
    icon: BookHeart,
    title: 'Biblioteca y Recetario',
    text: 'Guarda tus recetas y explora el recetario base. Clasifícalas por categoría y dieta para encontrarlas al instante.',
  },
  {
    icon: Target,
    title: 'Tus objetivos',
    text: 'Calcula tus calorías y macros. El plan se ajusta a tu objetivo, así que cada persona ve su propia porción.',
  },
  {
    icon: Wand2,
    title: 'Asistente',
    text: 'Háblale o escríbele: crea recetas, rellena tu plan, cambia objetivos o resuelve dudas. Un único asistente, también por voz.',
  },
];

export function WelcomeGuide() {
  const { shouldShow, dismiss, dismissForever } = useOnboardingFlag('welcome');
  const [step, setStep] = useState(0);

  if (!shouldShow) return null;

  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent className="max-w-md bg-glass">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">{slide.title}</DialogTitle>
          <DialogDescription className="text-center">{slide.text}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2">
          {SLIDES.map((_, i) => (
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
                Siguiente
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => dismissForever()}>
            No volver a mostrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
