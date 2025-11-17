'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Target, X, TrendingDown, Weight, TrendingUp, EggFried, Wheat, Droplets, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalculationResult, GoalMacros } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalculatorDialog } from './calculator-dialog';

const GoalCard = ({ title, icon: Icon, goal, isActive = false }: { title: string, icon: React.ElementType, goal: GoalMacros, isActive?: boolean }) => {
    return (
        <Card className={cn("text-center transition-all", isActive ? 'bg-primary text-primary-foreground' : 'bg-card')}>
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center justify-center gap-2">
                    <Icon className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <p className="text-3xl font-bold">{goal.calories}<span className="text-base font-normal"> kcal</span></p>
                <div className={cn(
                    "grid grid-cols-3 gap-2 mt-3 text-xs p-2 rounded-lg",
                    isActive ? 'bg-primary-foreground/20' : 'bg-secondary'
                )}>
                    <div className="flex flex-col items-center">
                        <EggFried className={cn("h-4 w-4", isActive ? 'text-amber-300' : 'text-amber-600')} />
                        <span className="font-bold">{goal.protein}g</span>
                        <span>Prot.</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Wheat className={cn("h-4 w-4", isActive ? 'text-yellow-300' : 'text-yellow-500')} />
                        <span className="font-bold">{goal.carbs}g</span>
                        <span>Carbs</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Droplets className={cn("h-4 w-4", isActive ? 'text-sky-300' : 'text-sky-500')} />
                        <span className="font-bold">{goal.fat}g</span>
                        <span>Grasa</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

const TargetGoalsDisplay = ({ result }: { result: CalculationResult | null }) => {
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    if (!result) {
        return (
            <>
                <Card className="w-full border-0 shadow-none bg-transparent">
                     <CardHeader className="px-0">
                        <CardTitle>Tus Objetivos Nutricionales</CardTitle>
                        <CardDescription>Aún no has calculado tus objetivos. ¡Pruébalo!</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 flex flex-col items-center justify-center text-center h-60">
                        <div className="text-center text-muted-foreground">
                            <Target className="h-12 w-12 mx-auto mb-2" />
                            <p className="mb-4">Usa la calculadora para establecer tus metas de calorías y macros.</p>
                            <Button onClick={() => setIsCalculatorOpen(true)}>
                                <Calculator className="mr-2 h-4 w-4" />
                                Abrir Calculadora
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <CalculatorDialog isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
            </>
        );
    }

    return (
        <Card className="w-full border-0 shadow-none bg-transparent">
            <CardHeader className="px-0">
                <CardTitle>Tus Objetivos Nutricionales</CardTitle>
                <CardDescription>Tus objetivos diarios calculados. Úsalos como guía.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs defaultValue="maintenance" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="loss">Perder Peso</TabsTrigger>
                        <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
                        <TabsTrigger value="gain">Ganar Músculo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="loss">
                        <GoalCard title="Objetivo: Perder Peso" icon={TrendingDown} goal={result.loss} isActive />
                    </TabsContent>
                    <TabsContent value="maintenance">
                        <GoalCard title="Objetivo: Mantenimiento" icon={Weight} goal={result.maintenance} isActive />
                    </TabsContent>
                    <TabsContent value="gain">
                        <GoalCard title="Objetivo: Ganar Músculo" icon={TrendingUp} goal={result.gain} isActive />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

export function FloatingGoals() {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);

  useEffect(() => {
    const fetchStoredResult = () => {
        const savedResult = localStorage.getItem('calorieResult');
        if (savedResult) {
            setResult(JSON.parse(savedResult));
        } else {
            setResult(null);
        }
    };

    fetchStoredResult();
    window.addEventListener('storage', fetchStoredResult);
    return () => {
        window.removeEventListener('storage', fetchStoredResult);
    };
  }, []);

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-28 h-16 w-16 rounded-full shadow-lg z-50"
          size="icon"
        >
          <Target className="h-8 w-8" />
        </Button>
      )}

      <div
        className={cn(
          'fixed bottom-8 right-8 w-96 bg-card rounded-lg shadow-2xl p-4 transform transition-all duration-300 ease-in-out z-50 origin-bottom-right',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        )}
      >
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => setIsOpen(false)}
        >
            <X className="h-5 w-5" />
        </Button>
        <TargetGoalsDisplay result={result} />
      </div>
    </>
  );
}
