'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Heart, Link2, Scale, Sparkles } from 'lucide-react';

import { ChefieMascot, type ChefiePose } from '@/components/nutri-planner/chefie-mascot';
import { Button } from '@/components/ui/button';
import { LIBRITO_CHAPTERS, type LibritoChapter } from '@/lib/librito-content';

/**
 * "El Librito": guía de referencia siempre disponible (a diferencia del tour,
 * que solo se ve una vez). Escritorio únicamente, por decisión del usuario —
 * misma razón que Mi Laboratorio: la UI móvil se sustituirá por la app nativa.
 *
 * Se lee paso a paso, con Chefie contándolo, igual que en la app. Antes era un
 * acordeón que soltaba seis párrafos de golpe: el mismo muro de texto que ya se
 * arregló en móvil. El contenido vive en `lib/librito-content.ts`.
 */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  redes: Link2,
  macros: Scale,
  app: Sparkles,
  relacion: Heart,
};

interface LessonStep {
  lead?: string;
  text: string;
  pose: ChefiePose;
}

/** Los `lead` acaban en "." o ":" para leerse en línea; como titular sobran. */
function cleanLead(lead: string): string {
  return lead.replace(/[.:]\s*$/, '');
}

/** Un texto que seguía a un ":" empieza en minúscula; suelto parece errata. */
function capitalizeFirst(text: string): string {
  const i = text.search(/[a-záéíóúñ]/);
  if (i !== 0) return text;
  return text[0].toUpperCase() + text.slice(1);
}

// Se van rotando para que no salga siempre la misma postura.
const BULLET_POSES: ChefiePose[] = ['point', 'explain', 'whisk', 'thumbsup'];

/** Trocea un capítulo en pasos: intro, cada consejo por separado, y el cierre. */
function buildSteps(ch: LibritoChapter): LessonStep[] {
  const steps: LessonStep[] = [];
  if (ch.intro) steps.push({ text: ch.intro, pose: 'explain' });
  ch.bullets.forEach((b, i) =>
    steps.push({
      lead: cleanLead(b.lead),
      text: capitalizeFirst(b.text),
      pose: BULLET_POSES[i % BULLET_POSES.length],
    })
  );
  if (ch.outro) steps.push({ text: ch.outro, pose: 'celebrate' });
  return steps;
}

export default function LibritoPage() {
  const [lesson, setLesson] = useState<LibritoChapter | null>(null);
  const [step, setStep] = useState(0);

  const steps = useMemo(() => (lesson ? buildSteps(lesson) : []), [lesson]);

  const open = (ch: LibritoChapter) => {
    setLesson(ch);
    setStep(0);
  };

  if (lesson) {
    const current = steps[step];
    const isLast = step === steps.length - 1;
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setLesson(null)} aria-label="Volver al índice del Librito">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary leading-none mb-1">Lección</p>
              <h1 className="text-xl font-bold font-headline leading-tight">{lesson.title}</h1>
            </div>
          </div>

          {/* Cuánto queda: troceado sin indicador, no sabrías si faltan dos
              pasos o diez. */}
          <div className="h-1 rounded-full bg-muted overflow-hidden mb-8">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="flex items-start gap-6">
            <div className="shrink-0 pt-2">
              <ChefieMascot pose={current.pose} size={150} />
            </div>
            <div className="min-w-0 flex-1 rounded-lg border bg-glass p-6 space-y-2">
              {current.lead && <h2 className="text-lg font-semibold font-headline">{current.lead}</h2>}
              <p className="text-[15px] leading-relaxed text-muted-foreground">{current.text}</p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {step + 1} de {steps.length}
            </p>
            <div className="flex-1" />
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                Atrás
              </Button>
            )}
            <Button onClick={() => (isLast ? setLesson(null) : setStep((s) => s + 1))}>
              {isLast ? 'Terminar' : 'Siguiente'}
              {isLast ? <Check className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/dashboard" aria-label="Volver al planificador">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary leading-none mb-1 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> El Librito
            </p>
            <h1 className="text-2xl font-bold font-headline leading-tight">Trucos y consejos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cuatro lecciones cortas. Entra en la que quieras y te la cuento poco a poco.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {LIBRITO_CHAPTERS.map((ch) => {
            const Icon = ICONS[ch.id] ?? Sparkles;
            const count = buildSteps(ch).length;
            return (
              <button
                key={ch.id}
                onClick={() => open(ch)}
                className="flex w-full items-center gap-3 rounded-lg border bg-glass px-4 py-4 text-left transition-colors hover:bg-accent/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{ch.title}</p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {ch.subtitle} · {count} pasos
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
