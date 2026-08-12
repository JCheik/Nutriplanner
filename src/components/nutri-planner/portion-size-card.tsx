'use client';

import { useEffect, useState } from 'react';
import { UtensilsCrossed, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { PORTION_FACTOR_MAX, PORTION_FACTOR_MIN, REFERENCE_DAILY_KCAL } from '@/lib/constants';
import { formatPortionFactor } from '@/lib/serving-utils';

/**
 * Tamaño de ración: lo que adapta el recetario de Nutrilp a quien lo mira.
 *
 * Va aquí, en Objetivos, porque es de donde sale el número — y verlo al lado del
 * cálculo es lo que explica por qué vale lo que vale sin tener que contarlo.
 * Normalmente no hay que tocarlo; el deslizador existe para quien come más o
 * menos de lo que dice su objetivo.
 */
export function PortionSizeCard({
  factor,
  isManual,
  onChange,
}: {
  factor: number;
  isManual: boolean;
  onChange: (factor: number | null) => void;
}) {
  // Borrador local: el deslizador tiene que moverse suave, y escribir en
  // Firestore en cada píxel sería una escritura por gesto.
  const [draft, setDraft] = useState(factor);
  useEffect(() => setDraft(factor), [factor]);

  return (
    <div className="border-t p-4 sm:p-6 space-y-3">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-4 w-4 text-primary" />
        <Label className="text-base font-semibold">Tamaño de tus raciones</Label>
      </div>

      <p className="text-sm text-muted-foreground">
        Las recetas de Nutrilp están escritas para {REFERENCE_DAILY_KCAL} kcal al día.
        {isManual
          ? ' Lo tienes ajustado a mano.'
          : ' Se ajustan solas a tu objetivo, así que las ves a tu medida.'}
      </p>

      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold tabular-nums w-20">{formatPortionFactor(draft)}</span>
        <Slider
          value={[draft]}
          min={PORTION_FACTOR_MIN}
          max={PORTION_FACTOR_MAX}
          step={0.05}
          onValueChange={([v]) => setDraft(v)}
          onValueCommit={([v]) => onChange(v)}
          aria-label="Tamaño de tus raciones"
          className="flex-1"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Una receta de 600 kcal por plato se te sirve a{' '}
        <span className="font-semibold text-foreground">{Math.round(600 * draft)} kcal</span>.
        Tus propias recetas no se tocan: ya están escritas con tus cantidades.
      </p>

      {isManual && (
        <Button variant="ghost" size="sm" onClick={() => onChange(null)} className="h-8 px-2 text-xs">
          <RotateCcw className="h-3 w-3 mr-1.5" />
          Volver a seguir mi objetivo
        </Button>
      )}
    </div>
  );
}
