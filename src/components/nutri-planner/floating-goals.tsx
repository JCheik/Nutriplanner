'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Target, X, TrendingDown, Weight, TrendingUp, EggFried, Wheat, Droplets, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalculationResult, GoalMacros, GoalType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalculatorDialog } from './calculator-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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

    return (
        <div className="p-4 h-full flex flex-col">
            <div className='flex justify-between items-center mb-4'>
                <h3 className="text-lg font-semibold">Tus Objetivos</h3>
                <Button variant="outline" size="sm" onClick={handleOpenCalculator}>Editar</Button>
            </div>
            
            <Tabs defaultValue="maintenance" className="w-full" onValueChange={(value) => onGoalSelect(value as GoalType)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="loss">Perder</TabsTrigger>
                    <TabsTrigger value="maintenance">Mantener</TabsTrigger>
                    <TabsTrigger value="gain">Ganar</TabsTrigger>
                </TabsList>
                <TabsContent value="loss" className="mt-4">
                    <GoalCard title="Objetivo: Perder Peso" icon={TrendingDown} goal={result.loss} isActive />
                </TabsContent>
                <TabsContent value="maintenance" className="mt-4">
                    <GoalCard title="Objetivo: Mantenimiento" icon={Weight} goal={result.maintenance} isActive />
                </TabsContent>
                <TabsContent value="gain" className="mt-4">
                    <GoalCard title="Objetivo: Ganar Músculo" icon={TrendingUp} goal={result.gain} isActive />
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
    <>
      {/* Desktop uses a Dialog-like pop-up */}
      <div className="hidden lg:block">
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent 
                className={cn(
                'fixed bottom-24 right-8 w-96 rounded-lg shadow-2xl p-0 transform transition-all duration-300 ease-in-out z-50 origin-bottom-right bg-glass border-0',
                isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
                )}
                hideCloseButton
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-5 w-5" />
                </Button>
                <TargetGoalsDisplay result={calorieResult} onCalculate={onCalorieResultSave} onGoalSelect={onGoalSelect} />
            </DialogContent>
        </Dialog>
      </div>

      {/* Mobile uses a Sheet */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>Tus Objetivos Nutricionales</SheetTitle>
                    <SheetDescription>Calcula y selecciona tus metas diarias de calorías y macronutrientes.</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    <TargetGoalsDisplay result={calorieResult} onCalculate={onCalorieResultSave} onGoalSelect={onGoalSelect} />
                </div>
            </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
