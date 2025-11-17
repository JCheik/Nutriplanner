'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Target, Weight, TrendingDown, TrendingUp, Calculator, EggFried, Wheat, Droplets } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import type { Macros } from '@/lib/types';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  gender: z.enum(['male', 'female']),
  age: z.coerce.number().min(15, 'La edad debe ser mayor de 15').max(80, 'La edad debe ser menor de 80'),
  weight: z.coerce.number().min(30, 'El peso debe ser un número positivo'),
  height: z.coerce.number().min(100, 'La altura debe ser un número positivo'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very', 'extra']),
});

type FormValues = z.infer<typeof formSchema>;

interface GoalMacros extends Macros {
  // Protein, Carbs, Fat in grams
}

interface CalculationResult {
  bmr: number;
  maintenance: GoalMacros;
  loss: GoalMacros;
  gain: GoalMacros;
}

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

const activityDescriptions = {
    sedentary: 'Poco o ningún ejercicio',
    light: 'Ejercicio ligero (1-3 días/semana)',
    moderate: 'Ejercicio moderado (3-5 días/semana)',
    very: 'Ejercicio intenso (6-7 días/semana)',
    extra: 'Ejercicio muy intenso + trabajo físico',
};

interface CalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const calculateMacros = (calories: number, weight: number): GoalMacros => {
    // Protein: 2.2g per kg of body weight
    const proteinGrams = Math.round(weight * 2.2);
    const proteinCalories = proteinGrams * 4;

    // Fat: 25% of total calories
    const fatCalories = calories * 0.25;
    const fatGrams = Math.round(fatCalories / 9);

    // Carbs: Remaining calories
    const carbCalories = calories - proteinCalories - fatCalories;
    const carbGrams = Math.round(carbCalories / 4);

    return {
        calories: Math.round(calories),
        protein: proteinGrams,
        carbs: carbGrams,
        fat: fatGrams,
    };
};

export function CalculatorDialog({ isOpen, onClose }: CalculatorDialogProps) {
  const [result, setResult] = useState<CalculationResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: 'male',
      activityLevel: 'light',
    },
  });

  useEffect(() => {
    if (isOpen) {
        const savedResult = localStorage.getItem('calorieResult');
        if (savedResult) {
            setResult(JSON.parse(savedResult));
        }
    }
  }, [isOpen]);

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    let bmr: number;
    // Mifflin-St Jeor Equation
    if (data.gender === 'male') {
      bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + 5;
    } else {
      bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) - 161;
    }

    const maintenanceCalories = bmr * activityMultipliers[data.activityLevel];
    const lossCalories = maintenanceCalories * 0.8; // 20% deficit
    const gainCalories = maintenanceCalories * 1.1; // 10% surplus

    const newResult = {
      bmr: Math.round(bmr),
      maintenance: calculateMacros(maintenanceCalories, data.weight),
      loss: calculateMacros(lossCalories, data.weight),
      gain: calculateMacros(gainCalories, data.weight),
    };
    
    setResult(newResult);
    localStorage.setItem('calorieResult', JSON.stringify(newResult));
    
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new Event('storage'));
  };

  const MacroBreakdown = ({ goal, isPrimary }: { goal: GoalMacros, isPrimary?: boolean }) => (
    <div className={cn("mt-3 space-y-2 text-sm", isPrimary ? "text-primary-foreground/90" : "text-foreground")}>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <EggFried className={cn("h-4 w-4", isPrimary ? "text-amber-300" : "text-amber-600")} />
                <span>Proteína</span>
            </div>
            <span className="font-bold">{goal.protein}g</span>
        </div>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Wheat className={cn("h-4 w-4", isPrimary ? "text-yellow-300" : "text-yellow-500")} />
                <span>Carbohidratos</span>
            </div>
            <span className="font-bold">{goal.carbs}g</span>
        </div>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Droplets className={cn("h-4 w-4", isPrimary ? "text-sky-300" : "text-sky-500")} />
                <span>Grasa</span>
            </div>
            <span className="font-bold">{goal.fat}g</span>
        </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
             <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Calculadora de Calorías y Macros
              </DialogTitle>
              <DialogDescription>
                Utiliza la fórmula de Mifflin-St Jeor para estimar tus necesidades calóricas y de macronutrientes diarias según tu objetivo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-8 py-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Género</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center gap-4"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="male" />
                              </FormControl>
                              <FormLabel className="font-normal">Hombre</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="female" />
                              </FormControl>
                              <FormLabel className="font-normal">Mujer</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Edad</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="años" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="kg" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="cm" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="activityLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nivel de Actividad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona tu nivel de actividad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(activityDescriptions).map(([key, desc]) => (
                                <SelectItem key={key} value={key}>{desc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Calcular</Button>
                </form>
              </Form>

              <div className="flex flex-col items-center justify-center bg-secondary/50 p-6 rounded-lg">
                <CardTitle className="mb-4">Tus Resultados</CardTitle>
                {result ? (
                  <div className="space-y-4 w-full text-center">
                    <div className="p-4 rounded-lg bg-background">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Flame className="h-5 w-5" />
                            <h4 className="font-semibold">Metabolismo Basal (BMR)</h4>
                        </div>
                        <p className="text-3xl font-bold text-primary">{result.bmr} kcal/día</p>
                        <p className="text-xs text-muted-foreground">Calorías que tu cuerpo necesita en reposo total.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-background">
                            <h4 className="font-semibold text-sm flex items-center justify-center gap-1"><TrendingDown className="h-4 w-4"/>Perder Peso</h4>
                            <p className="text-xl font-bold">{result.loss.calories} <span className="text-sm text-muted-foreground">kcal/día</span></p>
                            <MacroBreakdown goal={result.loss} />
                        </div>
                         <div className="p-3 rounded-lg bg-primary text-primary-foreground border-2 border-primary-foreground/50">
                            <h4 className="font-semibold text-sm flex items-center justify-center gap-1"><Weight className="h-4 w-4"/>Mantenimiento</h4>
                            <p className="text-xl font-bold">{result.maintenance.calories} <span className="text-sm">kcal/día</span></p>
                            <MacroBreakdown goal={result.maintenance} isPrimary />
                        </div>
                         <div className="p-3 rounded-lg bg-background">
                            <h4 className="font-semibold text-sm flex items-center justify-center gap-1"><TrendingUp className="h-4 w-4"/>Ganar Músculo</h4>
                            <p className="text-xl font-bold">{result.gain.calories} <span className="text-sm text-muted-foreground">kcal/día</span></p>
                             <MacroBreakdown goal={result.gain} />
                        </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground pt-4">Estos son valores estimados. Tu ingesta real puede variar. Consulta a un profesional de la salud.</p>

                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-2" />
                    <p>Completa el formulario para ver tus resultados.</p>
                  </div>
                )}
              </div>
            </div>
        </DialogContent>
    </Dialog>
  );
}
