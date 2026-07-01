'use client';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// A recipe ingredient that isn't in the user's ingredient DB yet. Carries the
// AI's per-100g estimate so the user can review/edit it and choose whether to
// add it to their database. Shared by the URL import and the AI recipe dialog.
export interface ReviewIngredient {
  name: string;
  quantity: number;
  unit: string;
  // per 100g / 100ml
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  selected: boolean;
  corrected?: boolean;
  note?: string;
}

export type ReviewMacroField = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';

export function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 items-center min-w-[52px]">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-7 px-1.5 text-xs text-center w-full"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
    </div>
  );
}

/** One reviewable "new ingredient" row: toggle to add + editable per-100g macros. */
export function MissingIngredientRow({
  ing,
  onToggle,
  onMacroChange,
}: {
  ing: ReviewIngredient;
  onToggle: () => void;
  onMacroChange: (field: ReviewMacroField, value: number) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-colors',
        ing.selected ? 'border-border bg-card/40' : 'border-dashed opacity-50'
      )}
    >
      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={onToggle}>
        <Checkbox
          checked={ing.selected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-sm font-medium truncate min-w-0 flex-1">{ing.name}</span>
        {ing.corrected && (
          <span
            title={ing.note || 'Corregido por IA'}
            className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 cursor-help shrink-0"
          >
            <Info className="h-3 w-3" />
            Corregido
          </span>
        )}
        <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
          {ing.quantity} {ing.unit}
        </span>
      </div>
      {ing.corrected && ing.note && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 pl-7">{ing.note}</p>
      )}

      {ing.selected && (
        <div className="flex gap-2 pt-1 flex-wrap">
          <MacroInput label="Kcal" value={ing.calories} onChange={(v) => onMacroChange('calories', v)} />
          <MacroInput label="Prot (g)" value={ing.protein} onChange={(v) => onMacroChange('protein', v)} />
          <MacroInput label="Carbs (g)" value={ing.carbs} onChange={(v) => onMacroChange('carbs', v)} />
          <MacroInput label="Grasa (g)" value={ing.fat} onChange={(v) => onMacroChange('fat', v)} />
          <MacroInput label="Fibra (g)" value={ing.fiber} onChange={(v) => onMacroChange('fiber', v)} />
          <div className="flex items-end pb-1">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">/ 100g</span>
          </div>
        </div>
      )}
    </div>
  );
}
