'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CalendarDays, BookHeart, Sparkles, Camera, Target,
  ChevronRight, ChevronLeft, X, PartyPopper, Link2, Trash2,
} from 'lucide-react';

// ─── Mascot ─────────────────────────────────────────────────────────────────

type MascotMood = 'wave' | 'excited' | 'think' | 'point' | 'celebrate';

function NutriMascot({ mood = 'wave', size = 80 }: { mood?: MascotMood; size?: number }) {
  const isExcited = mood === 'excited' || mood === 'celebrate';
  const isThinking = mood === 'think';
  const isPointing = mood === 'point';
  const isWaving = mood === 'wave';

  return (
    <div className="nutri-bob flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">

        {/* Left arm — rendered BEHIND head */}
        {(isWaving || isExcited) && (
          <g className={isWaving ? 'nutri-wave' : ''} style={{ transformOrigin: '22px 86px' }}>
            <path
              d={isExcited ? 'M 22 86 Q 6 66 10 50' : 'M 22 86 Q 6 66 14 50'}
              stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round"
            />
            <circle cx={isExcited ? 10 : 14} cy="48" r="6" fill="#22c55e" />
          </g>
        )}
        {isThinking && (
          <path d="M 22 86 Q 14 74 22 64" stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round" />
        )}

        {/* Chef hat */}
        <rect x="33" y="4" width="34" height="21" rx="5" fill="white" stroke="#d1d5db" strokeWidth="1.5" />
        <rect x="22" y="22" width="56" height="12" rx="5" fill="white" stroke="#d1d5db" strokeWidth="1.5" />
        <line x1="25" y1="28" x2="75" y2="28" stroke="#f3f4f6" strokeWidth="1" />

        {/* Head */}
        <circle cx="50" cy="72" r="30" fill="#4ade80" />
        <ellipse cx="38" cy="60" rx="10" ry="7" fill="#86efac" opacity="0.25" />
        {/* Cheeks */}
        <ellipse cx="31" cy="80" rx="8" ry="5" fill="#86efac" opacity="0.6" />
        <ellipse cx="69" cy="80" rx="8" ry="5" fill="#86efac" opacity="0.6" />

        {/* Eyes */}
        {isThinking ? (
          <>
            <path d="M 35 67 Q 39 63 44 67" stroke="#111827" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 56 67 Q 61 63 66 67" stroke="#111827" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Raised eyebrow on one side */}
            <path d="M 56 59 Q 61 55 66 59" stroke="#111827" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : isExcited ? (
          <>
            <ellipse cx="39" cy="67" rx="6" ry="7" fill="#111827" />
            <circle cx="41" cy="64" r="2.5" fill="white" />
            <ellipse cx="61" cy="67" rx="6" ry="7" fill="#111827" />
            <circle cx="63" cy="64" r="2.5" fill="white" />
            <path d="M 34 58 Q 39 54 44 58" stroke="#111827" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 56 58 Q 61 54 66 58" stroke="#111827" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="39" cy="67" rx="5" ry="6" fill="#111827" />
            <circle cx="41" cy="65" r="2" fill="white" />
            <ellipse cx="61" cy="67" rx="5" ry="6" fill="#111827" />
            <circle cx="63" cy="65" r="2" fill="white" />
          </>
        )}

        {/* Mouth */}
        {isExcited ? (
          <>
            <path d="M 35 80 Q 50 96 65 80" fill="#111827" />
            <path d="M 37 81 Q 50 93 63 81" fill="#f0fdf4" />
          </>
        ) : isThinking ? (
          <path d="M 40 80 Q 49 85 58 78" stroke="#111827" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 38 79 Q 50 89 62 79" stroke="#111827" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}

        {/* Thought bubble */}
        {isThinking && (
          <>
            <circle cx="72" cy="60" r="3" fill="#d1d5db" />
            <circle cx="80" cy="51" r="5" fill="#d1d5db" />
            <circle cx="91" cy="39" r="9" fill="white" stroke="#d1d5db" strokeWidth="1.5" />
            <text x="91" y="44" textAnchor="middle" fontSize="12" fill="#9ca3af">?</text>
          </>
        )}

        {/* Right arm — in front of head */}
        {(isPointing || isExcited) && (
          <g>
            <path
              d={isExcited ? 'M 78 86 Q 94 66 90 50' : 'M 78 86 Q 95 66 98 50'}
              stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round"
            />
            <circle cx={isExcited ? 90 : 98} cy="48" r="6" fill="#22c55e" />
          </g>
        )}

        {/* Celebrate confetti */}
        {mood === 'celebrate' && (
          <>
            <circle cx="14" cy="28" r="3.5" fill="#f59e0b" className="nutri-confetti-a" />
            <rect x="79" y="22" width="5" height="5" rx="1" fill="#3b82f6" className="nutri-confetti-b" transform="rotate(20 81 24)" />
            <circle cx="85" cy="42" r="3" fill="#ef4444" className="nutri-confetti-c" />
            <circle cx="19" cy="48" r="2.5" fill="#8b5cf6" className="nutri-confetti-d" />
            <rect x="22" y="18" width="4" height="4" rx="1" fill="#10b981" className="nutri-confetti-e" transform="rotate(-15 24 20)" />
          </>
        )}
      </svg>
    </div>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────

interface OnboardingStep {
  targetSelector: string;
  title: string;
  description: string;
  tip?: string;
  icon: React.ElementType;
  position: 'top' | 'bottom' | 'left' | 'right';
  mood: MascotMood;
}

const STEPS: OnboardingStep[] = [
  {
    targetSelector: '[data-tour="meal-planner"]',
    title: 'Planificador Semanal',
    description: 'Arrastra recetas desde la biblioteca hasta el día que quieras. Los macros (calorías, proteínas, carbos y grasas) se actualizan al instante.',
    tip: 'Ajusta las raciones con los botones + y − dentro de cada receta.',
    icon: CalendarDays,
    position: 'bottom',
    mood: 'point',
  },
  {
    targetSelector: '[data-tour="autocomplete"]',
    title: 'Autocompletar con IA',
    description: '¿Sin ideas? Pulsa "Autocompletar" y la IA rellena los huecos vacíos de tu semana según tus objetivos nutricionales y preferencias.',
    icon: Sparkles,
    position: 'bottom',
    mood: 'excited',
  },
  {
    targetSelector: '[data-tour="clear-plan"]',
    title: 'Limpiar el Plan',
    description: 'Borra todas las recetas de un día pasando el ratón por su nombre y pulsando la papelera, o limpia la semana entera con este botón.',
    tip: 'Se pedirá confirmación antes de borrar para evitar accidentes.',
    icon: Trash2,
    position: 'bottom',
    mood: 'think',
  },
  {
    targetSelector: '[data-tour="recipe-library"]',
    title: 'Biblioteca de Recetas',
    description: 'Tus recetas y las de NutriPlanner, organizadas en carpetas. Filtra por nombre, ingrediente o propiedades como "Alta en proteína".',
    tip: 'Arrastra una receta a una carpeta del panel izquierdo para organizarla.',
    icon: BookHeart,
    position: 'top',
    mood: 'wave',
  },
  {
    targetSelector: '[data-tour="recipe-import"]',
    title: 'Importar desde URL',
    description: '¿Encontraste una receta en Instagram o TikTok? Pega el enlace y la IA extrae la receta completa, incluyendo ingredientes y macros.',
    icon: Link2,
    position: 'top',
    mood: 'point',
  },
  {
    targetSelector: '[data-tour="fridge-scanner"]',
    title: 'Escanear Nevera Vacía',
    description: 'Sube una foto de tu nevera y la IA detecta los ingredientes disponibles para sugerirte 3 recetas que puedes preparar ahora mismo.',
    icon: Camera,
    position: 'top',
    mood: 'think',
  },
  {
    targetSelector: '[data-tour="ai-assistant"]',
    title: 'Asistente IA',
    description: 'Chatea con NutriBot para crear recetas personalizadas paso a paso. Cuéntale tus restricciones, objetivos o ingredientes favoritos.',
    icon: Sparkles,
    position: 'top',
    mood: 'excited',
  },
  {
    targetSelector: '[data-tour="floating-menu"]',
    title: 'Menú Flotante',
    description: 'Acceso rápido a tus objetivos nutricionales, lista de la compra inteligente, notas adhesivas y todas las herramientas de IA desde cualquier punto.',
    icon: Target,
    position: 'left',
    mood: 'wave',
  },
];

const STORAGE_KEY = 'nutriplanner-onboarding-v2';

// Fixed confetti positions to avoid hydration mismatch
const CONFETTI = [
  { left: 12, delay: 0,    color: '#f59e0b' },
  { left: 23, delay: 0.1,  color: '#10b981' },
  { left: 35, delay: 0.2,  color: '#3b82f6' },
  { left: 50, delay: 0.05, color: '#ef4444' },
  { left: 62, delay: 0.15, color: '#8b5cf6' },
  { left: 73, delay: 0.3,  color: '#f59e0b' },
  { left: 85, delay: 0.1,  color: '#10b981' },
  { left: 15, delay: 0.25, color: '#3b82f6' },
  { left: 42, delay: 0.05, color: '#ef4444' },
  { left: 58, delay: 0.2,  color: '#8b5cf6' },
  { left: 78, delay: 0.35, color: '#f59e0b' },
  { left: 30, delay: 0.15, color: '#10b981' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function OnboardingTour({ forceShow = false }: { forceShow?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (forceShow) { setIsVisible(true); return; }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage unavailable */ }
  }, [forceShow]);

  const updateSpotlight = useCallback(() => {
    if (showWelcome || showCongrats) { setSpotlightRect(null); return; }
    const el = document.querySelector(STEPS[currentStep]?.targetSelector ?? '');
    setSpotlightRect(el ? el.getBoundingClientRect() : null);
  }, [currentStep, showWelcome, showCongrats]);

  useEffect(() => {
    if (!isVisible) return;
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [isVisible, updateSpotlight]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleComplete = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* ignore */ }
    setIsVisible(false);
  }, []);

  const handleSkip = useCallback(() => handleComplete(), [handleComplete]);

  const handleNext = useCallback(() => {
    if (showWelcome) { setShowWelcome(false); return; }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(p => p + 1);
    } else {
      setShowCongrats(true);
    }
  }, [showWelcome, currentStep]);

  const handlePrev = useCallback(() => {
    if (showCongrats) { setShowCongrats(false); return; }
    if (currentStep > 0) setCurrentStep(p => p - 1);
  }, [showCongrats, currentStep]);

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const StepIcon = step?.icon;

  // Tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!spotlightRect || !step) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const pad = 16;
    const W = 380;
    const H = 240;
    const vw = window.innerWidth;
    const clampX = (x: number) => Math.max(pad, Math.min(x, vw - W - pad));
    switch (step.position) {
      case 'bottom': return { top: spotlightRect.bottom + pad, left: clampX(spotlightRect.left + spotlightRect.width / 2 - W / 2) };
      case 'top':    return { top: Math.max(pad, spotlightRect.top - H - pad), left: clampX(spotlightRect.left + spotlightRect.width / 2 - W / 2) };
      case 'left':   return { top: Math.max(pad, spotlightRect.top + spotlightRect.height / 2 - H / 2), left: Math.max(pad, spotlightRect.left - W - pad) };
      case 'right':  return { top: Math.max(pad, spotlightRect.top + spotlightRect.height / 2 - H / 2), left: spotlightRect.right + pad };
      default:       return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <>
      <style>{`
        @keyframes nutri-bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes nutri-wave-anim {
          0%, 100% { transform: rotate(0deg); }
          30%      { transform: rotate(28deg); }
          65%      { transform: rotate(-12deg); }
        }
        @keyframes nutri-confetti-float {
          0%   { transform: translateY(0px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(50px) rotate(360deg); opacity: 0; }
        }
        @keyframes nutri-confetti-a { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(50px) rotate(360deg);opacity:0} }
        @keyframes nutri-confetti-b { 0%{transform:translateY(0) rotate(20deg);opacity:1} 100%{transform:translateY(45px) rotate(400deg);opacity:0} }
        @keyframes nutri-confetti-c { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(55px) rotate(320deg);opacity:0} }
        @keyframes nutri-confetti-d { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(48px) rotate(280deg);opacity:0} }
        @keyframes nutri-confetti-e { 0%{transform:translateY(0) rotate(-15deg);opacity:1} 100%{transform:translateY(52px) rotate(340deg);opacity:0} }
        .nutri-bob { animation: nutri-bob 2.5s ease-in-out infinite; }
        .nutri-wave { animation: nutri-wave-anim 1.5s ease-in-out infinite; transform-origin: 22px 86px; }
        .nutri-confetti-a { animation: nutri-confetti-a 1.6s ease-out infinite; }
        .nutri-confetti-b { animation: nutri-confetti-b 1.4s ease-out 0.1s infinite; }
        .nutri-confetti-c { animation: nutri-confetti-c 1.8s ease-out 0.2s infinite; }
        .nutri-confetti-d { animation: nutri-confetti-d 1.5s ease-out 0.05s infinite; }
        .nutri-confetti-e { animation: nutri-confetti-e 1.7s ease-out 0.15s infinite; }
        @keyframes onboarding-pulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
          50%       { box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
        }
        .onboarding-spotlight { animation: onboarding-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
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
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55), 0 0 30px rgba(0,0,0,0.3)',
              background: 'transparent',
            }}
          />
        )}

        {/* ── Welcome ── */}
        {showWelcome && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Card className="w-[420px] bg-card border shadow-2xl animate-in zoom-in-95 fade-in duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <NutriMascot mood="wave" size={110} />
                </div>
                <h2 className="text-2xl font-bold mb-1">¡Hola! Soy Nutri 👋</h2>
                <p className="text-sm text-muted-foreground mb-1">Tu asistente de NutriPlanner</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 mt-3">
                  Te enseñaré todas las funciones en menos de 2 minutos para que empieces a planificar tus comidas como un profesional.
                </p>
                <div className="flex flex-col gap-2">
                  <Button className="w-full" size="lg" onClick={handleNext}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    ¡Empezamos!
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={handleSkip}>
                    Ya conozco la app, saltar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Congrats ── */}
        {showCongrats && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Card className="w-[420px] bg-card border shadow-2xl animate-in zoom-in-95 fade-in duration-300">
              <CardContent className="p-8 text-center relative overflow-hidden">
                {CONFETTI.map((c, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-sm"
                    style={{
                      left: `${c.left}%`,
                      top: '-4%',
                      backgroundColor: c.color,
                      animation: `nutri-confetti-float 1.5s ease-out ${c.delay}s infinite`,
                    }}
                  />
                ))}
                <div className="flex justify-center mb-4">
                  <NutriMascot mood="celebrate" size={110} />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Tour completado! 🎉</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Ya conoces todo lo que NutriPlanner puede hacer por ti. ¡Es hora de empezar a planificar!
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handlePrev}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Repasar
                  </Button>
                  <Button className="flex-1" onClick={handleComplete}>
                    <PartyPopper className="mr-2 h-4 w-4" />
                    ¡A cocinar!
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Step tooltip ── */}
        {!showWelcome && !showCongrats && step && (
          <Card
            className="absolute z-[101] bg-card border shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
            style={{ width: 380, ...getTooltipStyle() }}
          >
            <CardContent className="p-4">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-3">
                <NutriMascot mood={step.mood} size={64} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {StepIcon && <StepIcon className="h-4 w-4 text-primary flex-shrink-0" />}
                      <span className="text-xs font-medium text-muted-foreground">
                        {currentStep + 1} / {STEPS.length}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={handleSkip}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                    />
                  </div>
                  <h3 className="font-bold text-sm mt-2">{step.title}</h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

              {/* Tip */}
              {step.tip && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/15">
                  <p className="text-xs text-primary/90 leading-relaxed">
                    <span className="font-semibold">Consejo: </span>{step.tip}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="text-xs h-8"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Anterior
                </Button>
                <div className="flex gap-1">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        i === currentStep ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>
                <Button size="sm" onClick={handleNext} className="text-xs h-8">
                  {currentStep === STEPS.length - 1 ? (
                    <>Finalizar <PartyPopper className="ml-1 h-3.5 w-3.5" /></>
                  ) : (
                    <>Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" /></>
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
