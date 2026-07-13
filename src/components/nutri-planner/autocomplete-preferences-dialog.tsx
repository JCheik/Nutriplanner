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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AutocompletePreferences {
  allowRepetition: 'no_repeat' | 'max_n' | 'free';
  // Only meaningful when allowRepetition === 'max_n': how many times the same
  // recipe may appear across the week (user-chosen, 2–7).
  maxRepetitions?: number;
  priority: 'goal' | 'protein' | 'calories';
  dietaryRestrictions: string;
  goalMarginPercent: number;
  // Which pool of recipes the AI can pick from: just the user's own, or also
  // the shared Nutrilp base recipes.
  recipeSource: 'all' | 'mine';
}

interface AutocompletePreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (preferences: AutocompletePreferences) => void;
  isLoading: boolean;
  hasGoal: boolean;
}

export function AutocompletePreferencesDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  hasGoal,
}: AutocompletePreferencesDialogProps) {
  const [allowRepetition, setAllowRepetition] = useState<AutocompletePreferences['allowRepetition']>('max_n');
  const [maxRepetitions, setMaxRepetitions] = useState(2);
  const [priority, setPriority] = useState<AutocompletePreferences['priority']>(hasGoal ? 'goal' : 'protein');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [goalMarginPercent, setGoalMarginPercent] = useState(15);
  const [recipeSource, setRecipeSource] = useState<AutocompletePreferences['recipeSource']>('all');

  const handleConfirm = () => {
    onConfirm({ allowRepetition, maxRepetitions, priority, dietaryRestrictions, goalMarginPercent, recipeSource });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-glass flex flex-col max-h-[90dvh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Autocompletar semana</DialogTitle>
          <DialogDescription>
            Dinos tus preferencias para que la IA genere el mejor plan posible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2 flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {/* Repetición */}
          <div className="space-y-3">
            <Label className="font-semibold text-sm">¿Repetir recetas?</Label>
            <RadioGroup
              value={allowRepetition}
              onValueChange={(v) => setAllowRepetition(v as AutocompletePreferences['allowRepetition'])}
              className="space-y-2"
            >
              <label
                htmlFor="rep-no_repeat"
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  allowRepetition === 'no_repeat' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30'
                )}
              >
                <RadioGroupItem value="no_repeat" id="rep-no_repeat" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Sin repetición</p>
                  <p className="text-xs text-muted-foreground">Cada receta aparece como máximo una vez</p>
                </div>
              </label>

              {/* Limited repetition with a user-chosen cap (2–7 times per week) */}
              <label
                htmlFor="rep-max_n"
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  allowRepetition === 'max_n' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30'
                )}
              >
                <RadioGroupItem value="max_n" id="rep-max_n" className="mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Repetición limitada</p>
                  <p className="text-xs text-muted-foreground">
                    Cada receta puede aparecer hasta {maxRepetitions} veces por semana
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {[2, 3, 4, 5, 6, 7].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setMaxRepetitions(n);
                          setAllowRepetition('max_n');
                        }}
                        aria-label={`Máximo ${n} veces por semana`}
                        className={cn(
                          'h-7 w-7 rounded-full border text-xs font-medium transition-colors',
                          allowRepetition === 'max_n' && maxRepetitions === n
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:bg-accent/40'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </label>

              <label
                htmlFor="rep-free"
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  allowRepetition === 'free' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30'
                )}
              >
                <RadioGroupItem value="free" id="rep-free" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Sin restricción</p>
                  <p className="text-xs text-muted-foreground">La IA elige libremente</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Origen de las recetas */}
          <div className="space-y-3">
            <Label className="font-semibold text-sm">¿Qué recetas puede usar?</Label>
            <RadioGroup
              value={recipeSource}
              onValueChange={(v) => setRecipeSource(v as AutocompletePreferences['recipeSource'])}
              className="space-y-2"
            >
              {[
                { value: 'all', label: 'Mis recetas + Nutrilp', desc: 'Usa también el recetario base de la app' },
                { value: 'mine', label: 'Solo mis recetas', desc: 'Ignora las recetas base de Nutrilp' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  htmlFor={`src-${value}`}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    recipeSource === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30'
                  )}
                >
                  <RadioGroupItem value={value} id={`src-${value}`} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Prioridad */}
          <div className="space-y-3">
            <Label className="font-semibold text-sm">Prioridad nutricional</Label>
            <RadioGroup
              value={priority}
              onValueChange={(v) => setPriority(v as AutocompletePreferences['priority'])}
              className="space-y-2"
            >
              {[
                ...(hasGoal ? [{ value: 'goal', label: 'Ajustar al objetivo', desc: 'Intenta acercarse a tus macros diarios' }] : []),
                { value: 'protein', label: 'Maximizar proteína', desc: 'Prioriza recetas con alto contenido proteico' },
                { value: 'calories', label: 'Minimizar calorías', desc: 'Selecciona las opciones más ligeras' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  htmlFor={`pri-${value}`}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    priority === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30'
                  )}
                >
                  <RadioGroupItem value={value} id={`pri-${value}`} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Margen de error (solo si priority === 'goal') */}
          {priority === 'goal' && hasGoal && (
            <div className="space-y-3">
              <Label className="font-semibold text-sm">Margen de error sobre el objetivo</Label>
              <RadioGroup
                value={String(goalMarginPercent)}
                onValueChange={(v) => setGoalMarginPercent(Number(v))}
                className="space-y-2"
              >
                {[
                  { value: '10', label: 'Estricto (±10%)', desc: 'Se necesitan más recetas disponibles' },
                  { value: '15', label: 'Moderado (±15%)', desc: 'Recomendado para la mayoría de casos' },
                  { value: '20', label: 'Flexible (±20%)', desc: 'Mayor libertad de elección' },
                ].map(({ value, label, desc }) => (
                  <label
                    key={value}
                    htmlFor={`margin-${value}`}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      goalMarginPercent === Number(value) ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30'
                    )}
                  >
                    <RadioGroupItem value={value} id={`margin-${value}`} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Preferencias alimenticias (gustos y manías, en texto libre) */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm">
              Preferencias alimenticias{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="ej: no me gusta el pollo, nada de ensalada, quiero hamburguesa un día..."
            />
            <p className="text-xs text-muted-foreground">
              Cuéntale a la IA lo que te apetece y lo que no: evitará lo que no te gusta e intentará
              incluir lo que pidas.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            <Sparkles className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            {isLoading ? 'Generando plan...' : 'Generar plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
