'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, Check } from 'lucide-react';
import { ChefieMascot, type ChefiePose } from './chefie-mascot';
import { CalculatorDialog } from './calculator-dialog';
import { useOnboardingFlag } from '@/hooks/use-onboarding';
import { useUserProfileState } from '@/hooks/use-user-profile-state';
import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * Tour guiado del dashboard de escritorio, presentado por Chefie: en vez del
 * "rectángulo en medio de la pantalla", la mascota se planta JUNTO a cada
 * control real (anclado por su atributo data-tour), lo señala y lo explica en
 * un bocadillo. Reemplaza a WelcomeGuide en escritorio (móvil conserva el
 * suyo hasta la app nativa).
 */

interface TourStep {
  id: string;
  /** Valor de data-tour del control a señalar; sin target = tarjeta centrada. */
  target?: string;
  title: string;
  text: string;
  pose?: ChefiePose;
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '¡Hola! Soy Chefie 👨‍🍳',
    text: 'Bienvenido a Nutrilp: aquí planificas tu semana de comidas, guardas tus recetas y llegas a tu objetivo sin pelearte con los números. ¿Te enseño lo importante? Es un minuto.',
    pose: 'explain',
  },
  {
    id: 'recipe-import',
    target: 'recipe-import',
    title: 'Nueva Receta',
    text: 'Crea recetas desde cero… o impórtalas: pega el enlace de una web de recetas, un Instagram, un TikTok o un YouTube y saco los ingredientes por ti.',
  },
  {
    id: 'ai-assistant',
    target: 'ai-assistant',
    title: 'Tu asistente con IA',
    text: 'Pídele recetas nuevas, que te rellene la semana o resuélvele dudas de nutrición. También puedes hablarle por voz.',
  },
  {
    id: 'nutrilp-tab',
    target: 'nutrilp-tab',
    title: 'Recetas Nutrilp',
    text: 'Nuestro recetario base. Son recetas generales: cópialas a «Mis Recetas» y ajusta ahí las cantidades a tu gusto y objetivo.',
  },
  {
    id: 'edit-plan',
    target: 'edit-plan',
    title: 'Edita tu plan',
    text: 'Añade o quita comidas en cada día, cámbiales el nombre y el tipo. El tipo de cada hueco es la guía que uso para autocompletarte bien.',
  },
  {
    id: 'autocomplete',
    target: 'autocomplete',
    title: 'Autocompletar',
    text: '¿Semana vacía? Te la relleno yo, respetando tu objetivo, tu dieta y tu entrevista de Mi Laboratorio.',
  },
  {
    id: 'download-plan',
    target: 'download-plan',
    title: 'Llévate el plan',
    text: 'Descarga tu semana como imagen para tenerla en el móvil, imprimirla o compartirla.',
  },
  {
    id: 'shopping-list',
    target: 'shopping-list',
    title: 'La compra',
    text: 'Tu lista de la compra. Importante: pulsa «Generar desde el Plan» para montarla con todo lo que lleva tu semana.',
  },
  {
    id: 'week-history',
    target: 'week-history',
    title: 'Historial de semanas',
    text: '¿Te ha quedado una semana redonda? Guárdala aquí y recupérala el mes que viene con dos clics.',
  },
  {
    id: 'laboratorio',
    target: 'laboratorio',
    title: 'Mi Laboratorio',
    text: 'Tu objetivo nutricional y la Entrevista, donde me cuentas tus gustos y alergias para que te cuide mejor. Te recomiendo empezar por ahí 😉',
  },
  {
    id: 'librito',
    target: 'librito',
    title: 'El Librito',
    text: 'Trucos de precisión (aceite en spray, bebidas cero…), cómo importar bien de redes sociales y un consejo importante: aquí no hay "trampas", solo comidas libres.',
  },
  {
    id: 'final',
    title: '¡Listo para cocinar!',
    text: 'Eso es todo. Si algún día quieres repetir este repaso: menú de tu avatar → «Ver guías de nuevo». ¡Que aproveche! 🥑',
    pose: 'celebrate',
  },
];

const PANEL_W = 420;

export function GuidedTour() {
  const { shouldShow, dismissForever } = useOnboardingFlag('guided-tour');
  // El tour cubre lo que contaban estos hints sueltos; se marcan como vistos
  // para que sus popovers no compitan con el overlay.
  const aiHint = useOnboardingFlag('ai-assistant');
  const autocompleteHint = useOnboardingFlag('autocomplete');
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { currentCalorieResult, activeGoal, handleCalorieResultSave } = useUserProfileState();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const hintsDismissed = useRef(false);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    if (shouldShow && !hintsDismissed.current) {
      hintsDismissed.current = true;
      aiHint.dismissForever();
      autocompleteHint.dismissForever();
    }
  }, [shouldShow, aiHint, autocompleteHint]);

  // Mide el control del paso actual y re-mide en resize/scroll.
  useLayoutEffect(() => {
    if (!shouldShow || !step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) {
      setRect(null); // control no presente → el paso se muestra centrado
      return;
    }
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [shouldShow, index, step?.target]);

  const finish = useCallback(() => { dismissForever(); }, [dismissForever]);
  const next = useCallback(() => {
    setIndex(i => (i >= STEPS.length - 1 ? i : i + 1));
  }, []);
  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  // Teclado: ← → navegan, Escape sale.
  useEffect(() => {
    if (!shouldShow || isCalculatorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') (index === STEPS.length - 1 ? finish() : next());
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shouldShow, isCalculatorOpen, index, finish, next, prev]);

  if (!shouldShow || isMobile) return null;

  const hasGoal = !!currentCalorieResult;
  const pose: ChefiePose = step.pose ?? (rect ? 'point' : 'explain');

  // Colocación del panel respecto al control: derecha → Chefie señala a la
  // izquierda (flip); izquierda → señala a la derecha; sin hueco → debajo.
  let panelStyle: React.CSSProperties = {};
  let flip = false;
  let below = false;
  if (rect && typeof window !== 'undefined') {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top = Math.min(Math.max(rect.top + rect.height / 2 - 80, 12), vh - 250);
    if (rect.right + 16 + PANEL_W <= vw - 12) {
      panelStyle = { top, left: rect.right + 16, width: PANEL_W };
      flip = true;
    } else if (rect.left - 16 - PANEL_W >= 12) {
      panelStyle = { top, left: rect.left - 16 - PANEL_W, width: PANEL_W };
    } else {
      below = true;
      panelStyle = {
        top: Math.min(rect.bottom + 14, vh - 240),
        left: Math.min(Math.max(rect.left + rect.width / 2 - PANEL_W / 2, 12), vw - PANEL_W - 12),
        width: PANEL_W,
      };
    }
  }

  // Dos filas fijas en vez de una sola con "justify-between": con un panel de
  // ancho limitado, meter "Saltar el tour" + contador + Atrás + Siguiente en
  // una fila desbordaba el recuadro (los botones no encogen). Con flex-1 los
  // botones de acción se reparten SIEMPRE el ancho disponible, sin desbordar.
  const controls = (
    <div className="mt-3 space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums shrink-0">Paso {index + 1} de {STEPS.length}</span>
        <button type="button" onClick={finish} className="shrink-0 hover:text-foreground hover:underline">
          Saltar el tour
        </button>
      </div>
      <div className="flex items-center gap-2">
        {index > 0 && (
          <Button variant="outline" size="sm" className="flex-1 min-w-0" onClick={prev}>Atrás</Button>
        )}
        {isLast ? (
          <Button size="sm" className="flex-1 min-w-0" onClick={finish}><Check className="mr-1.5 h-4 w-4 shrink-0" /> Empezar</Button>
        ) : (
          <Button size="sm" className="flex-1 min-w-0" onClick={next}>Siguiente</Button>
        )}
      </div>
    </div>
  );

  const bubbleCard = (
    <div className="rounded-xl border bg-background p-4 shadow-xl w-full min-w-0 overflow-hidden">
      <p className="font-semibold break-words">{step.title}</p>
      <p className="mt-1 text-sm text-muted-foreground break-words">{step.text}</p>
      {step.id === 'welcome' && !hasGoal && (
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setIsCalculatorOpen(true)}>
          <Calculator className="mr-2 h-4 w-4" />
          Primero, calcular mi objetivo
        </Button>
      )}
      {controls}
    </div>
  );

  return (
    <>
      {/* El diálogo de la calculadora (z-50 de Radix) debe quedar por encima:
          mientras esté abierto, el tour se oculta. */}
      {!isCalculatorOpen && (
        <>
          {/* Bloqueador de interacción; clic = avanzar */}
          <div className="fixed inset-0 z-[95]" onClick={isLast ? finish : next} aria-hidden />
          {rect ? (
            <>
              {/* Foco sobre el control: agujero con sombra gigante */}
              <div
                className="fixed z-[96] rounded-lg pointer-events-none transition-all duration-200"
                style={{
                  top: rect.top - 6,
                  left: rect.left - 6,
                  width: rect.width + 12,
                  height: rect.height + 12,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  border: '2px solid hsl(var(--primary))',
                }}
              />
              <div className="fixed z-[97]" style={panelStyle} onClick={e => e.stopPropagation()}>
                <div className={below ? 'flex items-start gap-1' : 'flex items-center gap-1'}>
                  {flip && <ChefieMascot pose={below ? 'explain' : pose} flip size={74} />}
                  <div className="flex-1 min-w-0">{bubbleCard}</div>
                  {!flip && <ChefieMascot pose={below ? 'explain' : pose} size={74} />}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="fixed inset-0 z-[96] bg-black/55 pointer-events-none" />
              <div
                className="fixed z-[97] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] max-w-[92vw]"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-col items-center">
                  <ChefieMascot pose={pose} size={110} />
                  <div className="w-full -mt-2">{bubbleCard}</div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <CalculatorDialog
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onCalculate={(result) => {
          handleCalorieResultSave(result);
          setIsCalculatorOpen(false);
          setIndex(1);
        }}
        initialResult={currentCalorieResult}
        activeGoal={activeGoal}
      />
    </>
  );
}
