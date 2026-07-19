'use client';

import { useState } from 'react';
import type { NutriInterview, DietTag } from '@/lib/types';
import { DIET_TAGS, DIET_TAG_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { X, Plus, Minus, Stethoscope, Pencil, Check } from 'lucide-react';

/**
 * "La entrevista": nutritionist-style questionnaire living in Mi Laboratorio.
 * Desktop-first by decision — mobile reuses the DATA (all AI flows read it from
 * the profile) but gets no dedicated UI for now.
 */

const FAVORITE_SUGGESTIONS = ['Pollo', 'Pasta', 'Arroz', 'Pescado', 'Huevos', 'Aguacate', 'Queso', 'Legumbres', 'Chocolate'];
const AVOID_SUGGESTIONS = ['Cebolla', 'Champiñones', 'Pepino', 'Picante', 'Coliflor', 'Atún', 'Tofu'];
const ALLERGY_SUGGESTIONS = ['Frutos secos', 'Marisco', 'Lactosa', 'Gluten', 'Huevo', 'Pescado', 'Soja'];

const TOTAL_STEPS = 8;

/** Free-text chip list with one-tap suggestions. */
function ChipsField({ value, onChange, suggestions, placeholder }: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  const has = (item: string) => value.some(v => v.toLowerCase() === item.toLowerCase());
  const add = (item: string) => {
    const clean = item.trim();
    if (!clean || has(clean)) return;
    onChange([...value, clean]);
  };
  const remove = (item: string) => onChange(value.filter(v => v !== item));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
              setDraft('');
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={() => { add(draft); setDraft(''); }}>
          Añadir
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(item => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-sm font-medium">
              {item}
              <button type="button" aria-label={`Quitar ${item}`} onClick={() => remove(item)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.filter(s => !has(s)).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className="rounded-full border border-input px-2.5 py-1 text-sm text-muted-foreground hover:bg-muted"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/** min..max stepper for the weekly-wish / repetition counters. */
function WishStepper({ label, hint, value, onChange, max = 7, min = 0 }: {
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={`Menos ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-10 text-center font-semibold tabular-nums">
          {value === 0 ? '—' : `${value}×`}
        </span>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={`Más ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Two mutually-exclusive option cards (radio behaviour, bigger touch target). */
function OptionCards<T extends string>({ options, value, onChange }: {
  options: { id: T; title: string; description: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-lg border p-4 text-left transition-colors',
            value === opt.id ? 'border-primary bg-primary/10' : 'hover:bg-muted'
          )}
        >
          <p className="font-medium flex items-center gap-2">
            {value === opt.id && <Check className="h-4 w-4 text-primary shrink-0" />}
            {opt.title}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
        </button>
      ))}
    </div>
  );
}

function emptyDraft(): NutriInterview {
  return {
    dietTags: [],
    favoriteFoods: [],
    avoidFoods: [],
    allergies: [],
    weeklyWishes: {},
    varietyPreference: 'variedad',
    quickWeekdays: false,
    freeMealsPerWeek: 0,
    updatedAt: '',
  };
}

export function NutriInterviewCard({ interview, onSave }: {
  interview: NutriInterview | null;
  onSave: (interview: NutriInterview) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<'view' | 'wizard'>('view');
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<NutriInterview>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  const startWizard = () => {
    setDraft(interview ? { ...interview, weeklyWishes: { ...interview.weeklyWishes } } : emptyDraft());
    setStep(0);
    setMode('wizard');
  };

  const finish = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...draft, updatedAt: new Date().toISOString() });
      setMode('view');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Summary / intro ─────────────────────────────────────────────────────────
  if (mode === 'view') {
    if (!interview) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <CardTitle>La entrevista</CardTitle>
            </div>
            <CardDescription>
              Ocho preguntas rápidas, como con un nutricionista: qué te encanta, qué evitas,
              alergias y cómo quieres tu semana. La IA las usará para montarte planes a tu medida
              en vez de menús genéricos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={startWizard}>Empezar la entrevista (2 min)</Button>
          </CardContent>
        </Card>
      );
    }

    const wishLabels: string[] = [];
    if (interview.weeklyWishes.legumbres) wishLabels.push(`${interview.weeklyWishes.legumbres}× legumbres`);
    if (interview.weeklyWishes.vegetariano) wishLabels.push(`${interview.weeklyWishes.vegetariano}× vegetariano`);
    if (interview.weeklyWishes.pescado) wishLabels.push(`${interview.weeklyWishes.pescado}× pescado`);

    const rows: { label: string; content: string }[] = [
      { label: 'Estilo de dieta', content: interview.dietTags.length > 0 ? interview.dietTags.map(t => DIET_TAG_LABELS[t] ?? t).join(', ') : 'Sin restricción' },
      { label: 'Te encanta', content: interview.favoriteFoods.join(', ') || '—' },
      { label: 'Evitas', content: interview.avoidFoods.join(', ') || '—' },
      { label: 'Alergias', content: interview.allergies.join(', ') || 'Ninguna' },
      { label: 'Cada semana', content: wishLabels.join(' · ') || 'Sin peticiones fijas' },
      { label: 'Variedad', content: interview.varietyPreference === 'variedad' ? 'Máxima variedad' : `No me importa repetir, hasta ${interview.maxRepeatsPerRecipe ?? 3}×` },
      { label: 'Entre semana', content: interview.quickWeekdays ? 'Platos rápidos (<20 min)' : 'El tiempo no es problema' },
      { label: 'Flexibilidad', content: (interview.freeMealsPerWeek ?? 0) > 0 ? `${interview.freeMealsPerWeek} comida(s) libre(s) por semana` : 'Plan completo, sin comidas libres' },
    ];

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <CardTitle>La entrevista</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={startWizard}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
          </div>
          <CardDescription>
            La IA usa estas respuestas al autocompletar tu semana y al sugerirte recetas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(r => (
              <div key={r.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</dt>
                <dd className="text-sm mt-0.5">{r.content}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────────
  const steps: { title: string; hint?: string; body: React.ReactNode }[] = [
    {
      title: '¿Sigues algún estilo de dieta?',
      hint: 'Puedes marcar varios. Filtra qué recetas puede usar la IA.',
      body: (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDraft(d => ({ ...d, dietTags: [] }))}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              draft.dietTags.length === 0 ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            Sin preferencia
          </button>
          {DIET_TAGS.map(({ value, label }) => {
            const tag = value as DietTag;
            const active = draft.dietTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setDraft(d => ({
                  ...d,
                  dietTags: active ? d.dietTags.filter(t => t !== tag) : [...d.dietTags, tag],
                }))}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: '¿Qué comidas te encantan?',
      hint: 'La IA intentará que aparezcan a menudo en tu semana.',
      body: <ChipsField value={draft.favoriteFoods} onChange={v => setDraft(d => ({ ...d, favoriteFoods: v }))} suggestions={FAVORITE_SUGGESTIONS} placeholder="Escribe una comida y pulsa Enter…" />,
    },
    {
      title: '¿Qué comidas evitas o no te gustan?',
      hint: 'La IA no las incluirá en tus planes.',
      body: <ChipsField value={draft.avoidFoods} onChange={v => setDraft(d => ({ ...d, avoidFoods: v }))} suggestions={AVOID_SUGGESTIONS} placeholder="Escribe una comida y pulsa Enter…" />,
    },
    {
      title: '¿Alguna alergia o intolerancia?',
      hint: 'Esto es una prohibición absoluta, más fuerte que un simple "no me gusta".',
      body: <ChipsField value={draft.allergies} onChange={v => setDraft(d => ({ ...d, allergies: v }))} suggestions={ALLERGY_SUGGESTIONS} placeholder="Escribe una alergia y pulsa Enter…" />,
    },
    {
      title: '¿Qué quieres asegurar cada semana?',
      hint: 'Como te diría un nutricionista: legumbres y pescado semanales son buena idea.',
      body: (
        <div className="space-y-2">
          <WishStepper label="Platos de legumbres" hint="Lentejas, garbanzos, alubias…" value={draft.weeklyWishes.legumbres ?? 0} onChange={n => setDraft(d => ({ ...d, weeklyWishes: { ...d.weeklyWishes, legumbres: n } }))} />
          <WishStepper label="Platos vegetarianos" hint="Días sin carne ni pescado" value={draft.weeklyWishes.vegetariano ?? 0} onChange={n => setDraft(d => ({ ...d, weeklyWishes: { ...d.weeklyWishes, vegetariano: n } }))} />
          <WishStepper label="Platos de pescado" hint="Blanco o azul" value={draft.weeklyWishes.pescado ?? 0} onChange={n => setDraft(d => ({ ...d, weeklyWishes: { ...d.weeklyWishes, pescado: n } }))} />
        </div>
      ),
    },
    {
      title: '¿Repetir platos o máxima variedad?',
      body: (
        <div className="space-y-3">
          <OptionCards
            value={draft.varietyPreference}
            onChange={v => setDraft(d => ({
              ...d,
              varietyPreference: v,
              maxRepeatsPerRecipe: v === 'repetir' ? (d.maxRepeatsPerRecipe ?? 3) : d.maxRepeatsPerRecipe,
            }))}
            options={[
              { id: 'variedad', title: 'Máxima variedad', description: 'Prefiero no repetir platos durante la semana.' },
              { id: 'repetir', title: 'No me importa repetir', description: 'Cocinar de una vez para varios días me viene bien (batch cooking).' },
            ]}
          />
          {draft.varietyPreference === 'repetir' && (
            <WishStepper
              label="Como mucho, repetir un plato"
              hint="A partir de aquí, mejor otra receta"
              value={draft.maxRepeatsPerRecipe ?? 3}
              min={2}
              max={7}
              onChange={n => setDraft(d => ({ ...d, maxRepeatsPerRecipe: n }))}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Entre semana, ¿cómo cocinas?',
      body: (
        <OptionCards
          value={draft.quickWeekdays ? 'rapido' : 'normal'}
          onChange={v => setDraft(d => ({ ...d, quickWeekdays: v === 'rapido' }))}
          options={[
            { id: 'rapido', title: 'Rápido, por favor', description: 'De lunes a viernes, platos de menos de ~20 minutos.' },
            { id: 'normal', title: 'El tiempo no es problema', description: 'Puedo cocinar recetas elaboradas cualquier día.' },
          ]}
        />
      ),
    },
    {
      title: '¿Cuántas comidas libres quieres a la semana?',
      hint: 'Una cena fuera, una pizza con amigos… La vida real también cuenta. El plan se genera completo, pero dejando un pequeño margen para que ese día sustituyas la receta sin remordimientos. 1–2 es lo habitual; 3 ya es mucho margen.',
      body: (
        <WishStepper
          label="Comidas libres por semana"
          hint="0 = plan completo sin margen extra"
          value={draft.freeMealsPerWeek ?? 0}
          max={3}
          onChange={n => setDraft(d => ({ ...d, freeMealsPerWeek: n }))}
        />
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <CardTitle>La entrevista</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">Paso {step + 1} de {TOTAL_STEPS}</span>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 pt-1" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{current.title}</h3>
          {current.hint && <p className="text-sm text-muted-foreground mt-0.5">{current.hint}</p>}
        </div>
        {current.body}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => setMode('view')}>Cancelar</Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
              Atrás
            </Button>
            {isLast ? (
              <Button type="button" onClick={finish} disabled={isSaving}>
                {isSaving ? 'Guardando…' : 'Guardar entrevista'}
              </Button>
            ) : (
              <Button type="button" onClick={() => setStep(s => s + 1)}>Siguiente</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
