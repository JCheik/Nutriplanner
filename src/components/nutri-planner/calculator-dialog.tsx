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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';

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

const MacroBreakdown = ({ goal }: { goal: GoalMacros }) => {
    const totalGrams = goal.protein + goal.carbs + goal.fat;
    const proteinPercentage = (goal.protein / totalGrams) * 100;
    const carbsPercentage = (goal.carbs / totalGrams) * 100;
    const fatPercentage = (goal.fat / totalGrams) * 100;

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <EggFried className="h-4 w-4 text-amber-500" />
                        <span>Prot.</span>
                    </div>
                    <span className="font-bold">{goal.protein}g</span>
                </div>
                <Progress value={proteinPercentage} className="h-2 [&>div]:bg-amber-500" />
            </div>
             <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <Wheat className="h-4 w-4 text-yellow-500" />
                        <span>Carbs</span>
                    </div>
                    <span className="font-bold">{goal.carbs}g</span>
                </div>
                <Progress value={carbsPercentage} className="h-2 [&>div]:bg-yellow-500" />
            </div>
             <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-sky-500" />
                        <span>Grasas</span>
                    </div>
                    <span className="font-bold">{goal.fat}g</span>
                </div>
                <Progress value={fatPercentage} className="h-2 [&>div]:bg-sky-500" />
            </div>
        </div>
    );
}

const GoalCard = ({ title, icon: Icon, goal }: { title: string, icon: React.ElementType, goal: GoalMacros }) => {
    return (
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
    )
}


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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
             <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Calculadora de Calorías y Macros
              </DialogTitle>
              <DialogDescription>
                Utiliza la fórmula de Mifflin-St Jeor para estimar tus necesidades diarias según tu objetivo.
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

              <div className="flex flex-col">
                {result ? (
                  <Tabs defaultValue="maintenance" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="loss">Perder Peso</TabsTrigger>
                        <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
                        <TabsTrigger value="gain">Ganar Músculo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="loss">
                        <GoalCard title="Objetivo: Perder Peso" icon={TrendingDown} goal={result.loss} />
                    </TabsContent>
                    <TabsContent value="maintenance">
                        <GoalCard title="Objetivo: Mantenimiento" icon={Weight} goal={result.maintenance} />
                    </TabsContent>
                    <TabsContent value="gain">
                        <GoalCard title="Objetivo: Ganar Músculo" icon={TrendingUp} goal={result.gain} />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full bg-secondary/50 rounded-lg text-center text-muted-foreground p-6">
                    <Target className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">Completa el formulario</h3>
                    <p>Introduce tus datos para calcular tus necesidades diarias.</p>
                  </div>
                )}
              </div>
            </div>
        </DialogContent>
    </Dialog>
  );
}
