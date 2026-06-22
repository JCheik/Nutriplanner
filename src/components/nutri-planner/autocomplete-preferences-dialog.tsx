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
  allowRepetition: 'no_repeat' | 'max_twice' | 'free';
  priority: 'goal' | 'protein' | 'calories';
  dietaryRestrictions: string;
  goalMarginPercent: number;
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
  const [allowRepetition, setAllowRepetition] = useState<AutocompletePreferences['allowRepetition']>('max_twice');
  const [priority, setPriority] = useState<AutocompletePreferences['priority']>(hasGoal ? 'goal' : 'protein');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [goalMarginPercent, setGoalMarginPercent] = useState(15);

  const handleConfirm = () => {
    onConfirm({ allowRepetition, priority, dietaryRestrictions, goalMarginPercent });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-glass">
        <DialogHeader>
          <DialogTitle>Autocompletar semana</DialogTitle>
          <DialogDescription>
            Dinos tus preferencias para que la IA genere el mejor plan posible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Repetición */}
          <div className="space-y-3">
            <Label className="font-semibold text-sm">¿Repetir recetas?</Label>
            <RadioGroup
              value={allowRepetition}
              onValueChange={(v) => setAllowRepetition(v as AutocompletePreferences['allowRepetition'])}
              className="space-y-2"
            >
              {[
                { value: 'no_repeat', label: 'Sin repetición', desc: 'Cada receta aparece como máximo una vez' },
                { value: 'max_twice', label: 'Máximo 2 veces por semana', desc: 'Permite alguna repetición puntual' },
                { value: 'free', label: 'Sin restricción', desc: 'La IA elige libremente' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  htmlFor={`rep-${value}`}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    allowRepetition === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30'
                  )}
                >
                  <RadioGroupItem value={value} id={`rep-${value}`} className="mt-0.5" />
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

          {/* Restricciones */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm">
              Restricciones alimentarias{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="ej: vegetariano, sin gluten, sin lactosa..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
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
