'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Target, X, TrendingDown, Weight, TrendingUp, EggFried, Wheat, Droplets, Calculator, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalculationResult, GoalMacros, GoalType } from "@/lib/types";
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
                        <span>Grasas</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

const TargetGoalsDisplay = ({ result, onCalculate, onGoalSelect }: { result: CalculationResult | null, onCalculate: (result: CalculationResult) => void, onGoalSelect: (goal: GoalType) => void }) => {
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    const handleOpenCalculator = () => {
        setIsCalculatorOpen(true);
    };

    if (!result) {
        return (
            <>
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <div className="text-center text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold mb-2">Calcula tus Metas</h3>
                        <p className="mb-4 text-sm">Usa la calculadora para establecer tus metas de calorías y macros.</p>
                        <Button onClick={handleOpenCalculator}>
                            <Calculator className="mr-2 h-4 w-4" />
                            Abrir Calculadora
                        </Button>
                    </div>
                </div>
                <CalculatorDialog isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} onCalculate={onCalculate} />
            </>
        );
    }
    
    const GoalHeader = ({ title }: { title: string }) => (
        <div className="flex justify-between items-center w-full">
            <span className="font-semibold">{title}</span>
            <Button variant="ghost" size="sm" onClick={handleOpenCalculator}>
                <Edit className="h-4 w-4 mr-2"/>
                Editar
            </Button>
        </div>
    );

    return (
        <div className="p-4 h-full flex flex-col">
            <Tabs defaultValue="maintenance" className="w-full flex-1 flex flex-col" onValueChange={(value) => onGoalSelect(value as GoalType)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="loss">Perder</TabsTrigger>
                    <TabsTrigger value="maintenance">Mantener</TabsTrigger>
                    <TabsTrigger value="gain">Ganar</TabsTrigger>
                </TabsList>
                <TabsContent value="loss" className="mt-4 flex-1">
                     <GoalHeader title="Objetivo: Perder Peso" />
                    <GoalCard icon={TrendingDown} goal={result.loss} isActive />
                </TabsContent>
                <TabsContent value="maintenance" className="mt-4 flex-1">
                     <GoalHeader title="Objetivo: Mantenimiento" />
                    <GoalCard icon={Weight} goal={result.maintenance} isActive />
                </TabsContent>
                <TabsContent value="gain" className="mt-4 flex-1">
                    <GoalHeader title="Objetivo: Ganar Músculo" />
                    <GoalCard icon={TrendingUp} goal={result.gain} isActive />
                </TabsContent>
            </Tabs>
            <CalculatorDialog isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} onCalculate={onCalculate} initialResult={result} />
        </div>
    );
}

interface FloatingGoalsProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  calorieResult: CalculationResult | null;
  onCalorieResultSave: (result: CalculationResult) => void;
  onGoalSelect: (goal: GoalType) => void;
}

export function FloatingGoals({ isOpen, onOpenChange, calorieResult, onCalorieResultSave, onGoalSelect }: FloatingGoalsProps) {
  return (
    <div 
        className={cn(
            'fixed bottom-24 right-8 w-96 rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out z-50 origin-bottom-right bg-glass border flex flex-col',
            'h-[450px]',
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        )}
    >
        <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5"/>
                Tus Objetivos
            </h2>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onOpenChange(false)}
            >
                <X className="h-5 w-5" />
            </Button>
        </div>
        <div className="flex-1">
            <TargetGoalsDisplay result={calorieResult} onCalculate={onCalorieResultSave} onGoalSelect={onGoalSelect} />
        </div>
    </div>
  );
}
