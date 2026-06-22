'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  CalendarDays, 
  BookHeart, 
  Sparkles, 
  ShoppingCart, 
  Camera, 
  Target,
  ChevronRight, 
  ChevronLeft, 
  X, 
  PartyPopper,
  Rocket
} from 'lucide-react';

interface OnboardingStep {
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    targetSelector: '[data-tour="meal-planner"]',
    title: '📅 Planificador Semanal',
    description: 'Arrastra recetas a los días de la semana para planificar tus comidas. ¡Los macros se actualizan en tiempo real!',
    icon: CalendarDays,
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="recipe-library"]',
    title: '📖 Biblioteca de Recetas',
    description: 'Aquí encontrarás todas tus recetas y las sugerencias de NutriPlanner. Puedes filtrar, ordenar y crear nuevas.',
    icon: BookHeart,
    position: 'top',
  },
  {
    targetSelector: '[data-tour="ai-assistant"]',
    title: '🤖 Asistente IA',
    description: 'Chatea con NutriBot para crear recetas personalizadas paso a paso. ¡También puedes autocompletar tu semana!',
    icon: Sparkles,
    position: 'top',
  },
  {
    targetSelector: '[data-tour="fridge-scanner"]',
    title: '📸 Escanear Nevera',
    description: 'Sube una foto de tu nevera y la IA detectará los ingredientes y te sugerirá 3 recetas al instante.',
    icon: Camera,
    position: 'top',
  },
  {
    targetSelector: '[data-tour="floating-menu"]',
    title: '⚡ Menú Rápido',
    description: 'Accede a tus objetivos nutricionales, lista de la compra, notas y herramientas de IA desde este menú flotante.',
    icon: Target,
    position: 'left',
  },
];

const STORAGE_KEY = 'nutriplanner-onboarding-completed';

interface OnboardingTourProps {
  /** Force display even if already completed (for testing/re-tours) */
  forceShow?: boolean;
}

export function OnboardingTour({ forceShow = false }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        // Small delay to let the dashboard render first
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available, skip
    }
  }, [forceShow]);

  const updateSpotlight = useCallback(() => {
    if (showWelcome || showCongrats) {
      setSpotlightRect(null);
      return;
    }

    const step = ONBOARDING_STEPS[currentStep];
    if (!step) return;

    const element = document.querySelector(step.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setSpotlightRect(rect);
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep, showWelcome, showCongrats]);

  useEffect(() => {
    if (!isVisible) return;
    
    updateSpotlight();
    
    // Recalculate on scroll/resize
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [isVisible, updateSpotlight]);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore
    }
    setIsVisible(false);
  }, []);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const handleNext = useCallback(() => {
    if (showWelcome) {
      setShowWelcome(false);
      return;
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowCongrats(true);
    }
  }, [currentStep, showWelcome]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const StepIcon = step?.icon;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!spotlightRect || !step) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const padding = 16;
    const tooltipWidth = 340;
    const tooltipHeight = 200;

    switch (step.position) {
      case 'bottom':
        return {
          top: spotlightRect.bottom + padding,
          left: Math.max(padding, Math.min(spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case 'top':
        return {
          top: Math.max(padding, spotlightRect.top - tooltipHeight - padding),
          left: Math.max(padding, Math.min(spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case 'left':
        return {
          top: Math.max(padding, spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2),
          left: Math.max(padding, spotlightRect.left - tooltipWidth - padding),
        };
      case 'right':
        return {
          top: Math.max(padding, spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2),
          left: spotlightRect.right + padding,
        };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <>
      <style>{`
        @keyframes onboarding-pulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
          50% { box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
        }
        .onboarding-spotlight {
          animation: onboarding-pulse 2s ease-in-out infinite;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
        }
        .confetti-particle {
          animation: confetti-fall 1.5s ease-out forwards;
        }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[100] transition-all duration-500"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Spotlight cutout */}
        {spotlightRect && !showWelcome && !showCongrats && (
          <div
            className="absolute rounded-xl border-2 border-primary/60 onboarding-spotlight transition-all duration-500 ease-in-out"
            style={{
              top: spotlightRect.top - 8,
              left: spotlightRect.left - 8,
              width: spotlightRect.width + 16,
              height: spotlightRect.height + 16,
              boxShadow: `
                0 0 0 9999px rgba(0, 0, 0, 0.55),
                0 0 30px rgba(0, 0, 0, 0.3)
              `,
              background: 'transparent',
            }}
          />
        )}

        {/* Welcome Screen */}
        {showWelcome && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Card className="w-[420px] bg-card border shadow-2xl animate-in zoom-in-95 duration-500">
              <CardContent className="p-8 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-headline mb-3">¡Bienvenido a NutriPlanner!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Te haremos un tour rápido de las funciones principales para que saques el máximo partido a tu planificador de comidas.
                </p>
                <div className="flex flex-col gap-2">
                  <Button className="w-full" onClick={handleNext}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Empezar tour
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
                    Saltar tour
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Congratulations Screen */}
        {showCongrats && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Card className="w-[420px] bg-card border shadow-2xl animate-in zoom-in-95 duration-500">
              <CardContent className="p-8 text-center relative overflow-hidden">
                {/* Confetti particles */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="confetti-particle absolute w-2 h-2 rounded-sm"
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      top: `${-5 + Math.random() * 10}%`,
                      backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'][i % 5],
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                  <PartyPopper className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold font-headline mb-3">¡Tour completado!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Ya conoces las funciones principales de NutriPlanner. ¡Empieza a planificar tus comidas y deja que la IA te ayude!
                </p>
                <Button className="w-full" onClick={handleComplete}>
                  Empezar a usar NutriPlanner
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step Tooltip */}
        {!showWelcome && !showCongrats && step && (
          <Card
            className="absolute w-[340px] bg-card border shadow-2xl animate-in fade-in-50 slide-in-from-bottom-4 duration-300 z-[101]"
            style={getTooltipStyle()}
          >
            <CardContent className="p-4">
              {/* Step counter */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {StepIcon && <StepIcon className="h-5 w-5 text-primary" />}
                  <span className="text-xs font-medium text-muted-foreground">
                    Paso {currentStep + 1} de {ONBOARDING_STEPS.length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSkip}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1 bg-secondary rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
                />
              </div>

              <h3 className="font-bold text-base font-headline mb-1.5">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="text-xs"
                >
                  <ChevronLeft className="mr-1 h-3 w-3" />
                  Anterior
                </Button>
                <Button size="sm" onClick={handleNext} className="text-xs">
                  {currentStep === ONBOARDING_STEPS.length - 1 ? (
                    <>
                      Finalizar
                      <PartyPopper className="ml-1 h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
