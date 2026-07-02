'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Weight, TrendingDown, TrendingUp, Calculator, EggFried, Wheat, Droplets, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import type { Macros, CalculationResult, CalculatorInputs, GoalType } from '@/lib/types';

const INPUTS_STORAGE_KEY = 'nutriplanner-calculator-inputs';

type GoalMacros = Macros;

interface CalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Persist the freshly calculated result (e.g. write to Firestore). */
  onCalculate?: (result: CalculationResult) => void;
  /** Previously saved result, used to pre-fill the form and preview. */
  initialResult?: CalculationResult | null;
  /** Which goal tab to highlight in the preview. */
  activeGoal?: GoalType;
}

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
} as const;

const activityDescriptions: Record<keyof typeof activityMultipliers, string> = {
  sedentary: 'Poco o ningún ejercicio',
  light: 'Ejercicio ligero (1-3 días/semana)',
  moderate: 'Ejercicio moderado (3-5 días/semana)',
  very: 'Ejercicio intenso (6-7 días/semana)',
  extra: 'Ejercicio muy intenso + trabajo físico',
};

const DEFAULT_INPUTS: CalculatorInputs = {
  gender: 'male',
  age: 30,
  weight: 70,
  height: 175,
  activityLevel: 'light',
};

function loadStoredInputs(): CalculatorInputs | null {
  try {
    const raw = localStorage.getItem(INPUTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CalculatorInputs) : null;
  } catch {
    return null;
  }
}

const calculateMacros = (calories: number, weight: number): GoalMacros => {
  // Protein: 2.2g per kg of body weight
  const proteinGrams = Math.round(weight * 2.2);
  const proteinCalories = proteinGrams * 4;

  // Fat: 25% of total calories
  const fatCalories = calories * 0.25;
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs: remaining calories
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbGrams = Math.max(0, Math.round(carbCalories / 4));

  return {
    calories: Math.round(calories),
    protein: proteinGrams,
    carbs: carbGrams,
    fat: fatGrams,
  };
};

function computeResult(inputs: CalculatorInputs, previousCustom?: GoalMacros): CalculationResult {
  const { gender, age, weight, height, activityLevel } = inputs;

  // Mifflin-St Jeor Equation
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const maintenanceCalories = bmr * activityMultipliers[activityLevel];
  const lossCalories = maintenanceCalories * 0.8; // 20% deficit
  const gainCalories = maintenanceCalories * 1.1; // 10% surplus

  return {
    bmr: Math.round(bmr),
    maintenance: calculateMacros(maintenanceCalories, weight),
    loss: calculateMacros(lossCalories, weight),
    gain: calculateMacros(gainCalories, weight),
    inputs,
    // Preserve any previously saved custom goal so recalculating doesn't wipe it.
    ...(previousCustom ? { custom: previousCustom } : {}),
  };
}

const MacroBreakdown = ({ goal }: { goal: GoalMacros }) => {
  const totalGrams = goal.protein + goal.carbs + goal.fat;
  const pct = (g: number) => (totalGrams > 0 ? (g / totalGrams) * 100 : 0);

  const rows = [
    { label: 'Prot.', value: goal.protein, icon: EggFried, color: 'text-amber-500', bar: '[&>div]:bg-amber-500' },
    { label: 'Carbs', value: goal.carbs, icon: Wheat, color: 'text-yellow-500', bar: '[&>div]:bg-yellow-500' },
    { label: 'Grasas', value: goal.fat, icon: Droplets, color: 'text-sky-500', bar: '[&>div]:bg-sky-500' },
  ];

  return (
    <div className="space-y-4">
      {rows.map(({ label, value, icon: Icon, color, bar }) => (
        <div key={label} className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', color)} />
              <span>{label}</span>
            </div>
            <span className="font-bold">{value}g</span>
          </div>
          <Progress value={pct(value)} className={cn('h-2', bar)} />
        </div>
      ))}
    </div>
  );
};

const GoalCard = ({ title, icon: Icon, goal }: { title: string; icon: React.ElementType; goal: GoalMacros }) => (
  <Card>
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </CardTitle>
      <CardDescription className="text-4xl font-bold text-foreground">
        {goal.calories} <span className="text-xl font-medium text-muted-foreground">kcal/día</span>
      </CardDescription>
    </CardHeader>
    <CardContent>
      <h4 className="text-sm font-semibold mb-3">Desglose de Macros</h4>
      <MacroBreakdown goal={goal} />
    </CardContent>
  </Card>
);

export function CalculatorDialog({ isOpen, onClose, onCalculate, initialResult, activeGoal }: CalculatorDialogProps) {
  const [inputs, setInputs] = useState<CalculatorInputs>(initialResult?.inputs ?? DEFAULT_INPUTS);
  const [errors, setErrors] = useState<Partial<Record<keyof CalculatorInputs, string>>>({});
  const [result, setResult] = useState<CalculationResult | null>(initialResult ?? null);
  const [previewTab, setPreviewTab] = useState<'loss' | 'maintenance' | 'gain'>(
    activeGoal && activeGoal !== 'custom' ? activeGoal : 'maintenance'
  );

  // (Re)initialise every time the dialog opens. Priority for the form values:
  // saved inputs from Firestore → localStorage → sensible defaults.
  useEffect(() => {
    if (!isOpen) return;
    setInputs(initialResult?.inputs ?? loadStoredInputs() ?? DEFAULT_INPUTS);
    setResult(initialResult ?? null);
    setErrors({});
    setPreviewTab(activeGoal && activeGoal !== 'custom' ? activeGoal : 'maintenance');
  }, [isOpen, initialResult, activeGoal]);

  const setField = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof CalculatorInputs, string>> = {};
    if (!(inputs.age >= 15 && inputs.age <= 80)) next.age = 'Entre 15 y 80 años';
    if (!(inputs.weight >= 30 && inputs.weight <= 400)) next.weight = 'Peso no válido';
    if (!(inputs.height >= 100 && inputs.height <= 250)) next.height = 'Altura no válida';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCalculate = () => {
    if (!validate()) return;
    const newResult = computeResult(inputs, result?.custom);
    setResult(newResult);
    try {
      localStorage.setItem(INPUTS_STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      /* ignore storage errors */
    }
  };

  const handleSave = () => {
    if (!result) return;
    onCalculate?.(result);
    onClose();
  };

  const numberValue = (v: number) => (Number.isFinite(v) ? String(v) : '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* max-h + scroll: on mobile the stacked form is taller than the viewport;
          without this the dialog overflowed off-screen (no close button visible,
          no scrolling) and looked frozen. */}
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Calculadora de Calorías y Macros
          </DialogTitle>
          <DialogDescription>
            Fórmula de Mifflin-St Jeor para estimar tus necesidades diarias. Calcula y luego guarda
            para aplicarlas a tus objetivos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 py-2">
          {/* --- Form --- */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-center block">Género</Label>
              <RadioGroup
                value={inputs.gender}
                onValueChange={(v) => setField('gender', v as CalculatorInputs['gender'])}
                className="flex items-center justify-center gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="gender-male" />
                  <Label htmlFor="gender-male" className="font-normal cursor-pointer">Hombre</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="gender-female" />
                  <Label htmlFor="gender-female" className="font-normal cursor-pointer">Mujer</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="age">Edad</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  placeholder="años"
                  value={numberValue(inputs.age)}
                  onChange={(e) => setField('age', Number(e.target.value))}
                  className="bg-input"
                />
                {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={numberValue(inputs.weight)}
                  onChange={(e) => setField('weight', Number(e.target.value))}
                  className="bg-input"
                />
                {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  inputMode="numeric"
                  placeholder="cm"
                  value={numberValue(inputs.height)}
                  onChange={(e) => setField('height', Number(e.target.value))}
                  className="bg-input"
                />
                {errors.height && <p className="text-xs text-destructive">{errors.height}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="activity">Nivel de Actividad</Label>
              <Select
                value={inputs.activityLevel}
                onValueChange={(v) => setField('activityLevel', v as CalculatorInputs['activityLevel'])}
              >
                <SelectTrigger id="activity" className="bg-input">
                  <SelectValue placeholder="Selecciona tu nivel de actividad" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(activityDescriptions).map(([key, desc]) => (
                    <SelectItem key={key} value={key}>{desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="w-full" onClick={handleCalculate}>
              <Calculator className="mr-2 h-4 w-4" />
              {result ? 'Recalcular' : 'Calcular'}
            </Button>
          </div>

          {/* --- Preview --- */}
          <div className="flex flex-col">
            {result ? (
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as typeof previewTab)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="loss">Perder</TabsTrigger>
                  <TabsTrigger value="maintenance">Mantener</TabsTrigger>
                  <TabsTrigger value="gain">Ganar</TabsTrigger>
                </TabsList>
                <TabsContent value="loss">
                  <GoalCard title="Perder Peso" icon={TrendingDown} goal={result.loss} />
                </TabsContent>
                <TabsContent value="maintenance">
                  <GoalCard title="Mantenimiento" icon={Weight} goal={result.maintenance} />
                </TabsContent>
                <TabsContent value="gain">
                  <GoalCard title="Ganar Músculo" icon={TrendingUp} goal={result.gain} />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[280px] bg-secondary/50 rounded-lg text-center text-muted-foreground p-6">
                <Target className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Completa el formulario</h3>
                <p>Introduce tus datos y pulsa «Calcular» para ver tus objetivos.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!result}>
            <Check className="mr-2 h-4 w-4" />
            Guardar y aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
