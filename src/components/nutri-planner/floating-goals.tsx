'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Target, X, TrendingDown, Weight, TrendingUp, EggFried, Wheat, Droplets, Calculator, Edit, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalculationResult, GoalMacros, GoalType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalculatorDialog } from './calculator-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const GOAL_META: Record<Exclude<GoalType, 'custom'>, { title: string; icon: React.ElementType }> = {
  loss: { title: 'Perder Peso', icon: TrendingDown },
  maintenance: { title: 'Mantenimiento', icon: Weight },
  gain: { title: 'Ganar Músculo', icon: TrendingUp },
};

/** Big read-only card for a formula-based goal (loss / maintenance / gain). */
const GoalCard = ({ title, icon: Icon, goal }: { title: string; icon: React.ElementType; goal: GoalMacros }) => (
  <Card className="bg-primary text-primary-foreground text-center">
    <CardContent className="p-5">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Icon className="h-5 w-5" />
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-4xl font-bold">
        {goal.calories}
        <span className="text-base font-normal"> kcal</span>
      </p>
      <div className="grid grid-cols-3 gap-2 mt-4 text-xs p-2 rounded-lg bg-primary-foreground/15">
        <Macro icon={EggFried} value={goal.protein} label="Prot." iconClass="text-amber-300" />
        <Macro icon={Wheat} value={goal.carbs} label="Carbs" iconClass="text-yellow-300" />
        <Macro icon={Droplets} value={goal.fat} label="Grasas" iconClass="text-sky-300" />
      </div>
    </CardContent>
  </Card>
);

const Macro = ({ icon: Icon, value, label, iconClass }: { icon: React.ElementType; value: number; label: string; iconClass: string }) => (
  <div className="flex flex-col items-center">
    <Icon className={cn('h-4 w-4', iconClass)} />
    <span className="font-bold">{Math.round(value)}g</span>
    <span>{label}</span>
  </div>
);

/** Editable form for a fully custom goal. */
const CustomGoalEditor = ({ goal, onSave }: { goal?: GoalMacros; onSave: (macros: GoalMacros) => void }) => {
  const [values, setValues] = useState<GoalMacros>(
    goal ?? { calories: 2000, protein: 150, carbs: 200, fat: 60 }
  );

  // Keep in sync when a saved custom goal arrives/changes from Firestore.
  useEffect(() => {
    if (goal) setValues(goal);
  }, [goal]);

  const fields: { key: keyof GoalMacros; label: string }[] = [
    { key: 'calories', label: 'Calorías (kcal)' },
    { key: 'protein', label: 'Proteína (g)' },
    { key: 'carbs', label: 'Carbs (g)' },
    { key: 'fat', label: 'Grasa (g)' },
  ];

  return (
    <Card className="border-primary">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Edit className="h-4 w-4 text-primary" />
          Objetivo Personalizado
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`custom-${key}`}>{label}</Label>
              <Input
                id={`custom-${key}`}
                type="number"
                inputMode="numeric"
                value={Number.isFinite(values[key]) ? String(values[key]) : ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <Button onClick={() => onSave(values)} className="w-full">
          <Check className="mr-2 h-4 w-4" />
          Guardar objetivo personalizado
        </Button>
      </CardContent>
    </Card>
  );
};

interface FloatingGoalsProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  calorieResult: CalculationResult | null;
  onCalorieResultSave: (result: CalculationResult) => void;
  onGoalSelect: (goal: GoalType) => void;
  onSaveCustomGoal: (macros: GoalMacros) => void;
  activeGoal: GoalType;
}

function GoalsContent({
  result,
  activeGoal,
  onCalorieResultSave,
  onGoalSelect,
  onSaveCustomGoal,
}: {
  result: CalculationResult | null;
  activeGoal: GoalType;
  onCalorieResultSave: (result: CalculationResult) => void;
  onGoalSelect: (goal: GoalType) => void;
  onSaveCustomGoal: (macros: GoalMacros) => void;
}) {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Empty state: no goals calculated yet.
  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <Target className="h-12 w-12 mb-3 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-1">Calcula tus metas</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Usa la calculadora para establecer tus objetivos de calorías y macros.
        </p>
        <Button onClick={() => setIsCalculatorOpen(true)}>
          <Calculator className="mr-2 h-4 w-4" />
          Abrir calculadora
        </Button>
        <CalculatorDialog
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          onCalculate={onCalorieResultSave}
        />
      </div>
    );
  }

  // The custom goal seeds from the saved custom value, falling back to maintenance.
  const customSeed = result.custom ?? result.maintenance;

  return (
    <div className="p-4 h-full flex flex-col">
      <Tabs
        value={activeGoal}
        onValueChange={(v) => onGoalSelect(v as GoalType)}
        className="w-full flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="loss">Perder</TabsTrigger>
          <TabsTrigger value="maintenance">Mantener</TabsTrigger>
          <TabsTrigger value="gain">Ganar</TabsTrigger>
          <TabsTrigger value="custom">Personal</TabsTrigger>
        </TabsList>

        {(['loss', 'maintenance', 'gain'] as const).map((key) => (
          <TabsContent key={key} value={key} className="mt-4 flex-1 space-y-3">
            <GoalCard title={GOAL_META[key].title} icon={GOAL_META[key].icon} goal={result[key]} />
            <Button variant="outline" className="w-full" onClick={() => setIsCalculatorOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar datos / recalcular
            </Button>
          </TabsContent>
        ))}

        <TabsContent value="custom" className="mt-4 flex-1">
          <CustomGoalEditor
            goal={customSeed}
            onSave={(macros) => {
              onSaveCustomGoal(macros);
              onGoalSelect('custom');
            }}
          />
        </TabsContent>
      </Tabs>

      <CalculatorDialog
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onCalculate={onCalorieResultSave}
        initialResult={result}
        activeGoal={activeGoal}
      />
    </div>
  );
}

export function FloatingGoals({
  isOpen,
  onOpenChange,
  calorieResult,
  onCalorieResultSave,
  onGoalSelect,
  onSaveCustomGoal,
  activeGoal,
}: FloatingGoalsProps) {
  return (
    <div
      className={cn(
        'fixed bottom-24 right-8 w-[420px] h-[540px] rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out z-50 origin-bottom-right bg-glass border flex flex-col',
        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
      )}
    >
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Tus Objetivos
        </h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <GoalsContent
          result={calorieResult}
          activeGoal={activeGoal}
          onCalorieResultSave={onCalorieResultSave}
          onGoalSelect={onGoalSelect}
          onSaveCustomGoal={onSaveCustomGoal}
        />
      </div>
    </div>
  );
}
