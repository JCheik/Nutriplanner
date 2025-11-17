'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Target, Weight, TrendingDown, TrendingUp } from 'lucide-react';

const formSchema = z.object({
  gender: z.enum(['male', 'female']),
  age: z.coerce.number().min(15, 'La edad debe ser mayor de 15').max(80, 'La edad debe ser menor de 80'),
  weight: z.coerce.number().min(30, 'El peso debe ser un número positivo'),
  height: z.coerce.number().min(100, 'La altura debe ser un número positivo'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very', 'extra']),
});

type FormValues = z.infer<typeof formSchema>;

interface CalculationResult {
  bmr: number;
  maintenance: number;
  loss: number;
  gain: number;
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

export default function CalculatorPage() {
  const [result, setResult] = useState<CalculationResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: 'male',
      activityLevel: 'light',
    },
  });

  useEffect(() => {
    const savedResult = localStorage.getItem('calorieResult');
    if (savedResult) {
      setResult(JSON.parse(savedResult));
    }
  }, []);

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    let bmr: number;
    if (data.gender === 'male') {
      bmr = 88.362 + (13.397 * data.weight) + (4.799 * data.height) - (5.677 * data.age);
    } else {
      bmr = 447.593 + (9.247 * data.weight) + (3.098 * data.height) - (4.330 * data.age);
    }

    const maintenance = bmr * activityMultipliers[data.activityLevel];
    const newResult = {
      bmr: Math.round(bmr),
      maintenance: Math.round(maintenance),
      loss: Math.round(maintenance * 0.8), // 20% deficit
      gain: Math.round(maintenance * 1.1), // 10% surplus
    };
    
    setResult(newResult);
    localStorage.setItem('calorieResult', JSON.stringify(newResult));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Calculadora de Ingesta Diaria de Calorías
              </CardTitle>
              <CardDescription>
                Utiliza la fórmula de Harris-Benedict para estimar tu gasto metabólico basal (BMR) y tus necesidades calóricas diarias según tu objetivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
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
                        <p className="text-xs text-muted-foreground">Calorías que tu cuerpo necesita en reposo.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-background">
                            <h4 className="font-semibold text-sm flex items-center justify-center gap-1"><TrendingDown className="h-4 w-4"/>Perder Peso</h4>
                            <p className="text-xl font-bold">{result.loss} <span className="text-sm text-muted-foreground">kcal/día</span></p>
                        </div>
                         <div className="p-3 rounded-lg bg-primary text-primary-foreground border-2 border-primary-foreground/50">
                            <h4 className="font-semibold text-sm flex items-center justify-center gap-1"><Weight className="h-4 w-4"/>Mantenimiento</h4>
                            <p className="text-xl font-bold">{result.maintenance} <span className="text-sm">kcal/día</span></p>
                        </div>
                         <div className="p-3 rounded-lg bg-background">
                            <h4 className="font-semibold text-sm flex items-center justify-center gap-1"><TrendingUp className="h-4 w-4"/>Ganar Músculo</h4>
                            <p className="text-xl font-bold">{result.gain} <span className="text-sm text-muted-foreground">kcal/día</span></p>
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
