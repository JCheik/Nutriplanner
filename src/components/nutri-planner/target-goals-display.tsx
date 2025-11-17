'use client';

import type { CalculationResult, GoalMacros } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingDown, Weight, TrendingUp, Flame, EggFried, Wheat, Droplets } from "lucide-react";

interface TargetGoalsDisplayProps {
    result: CalculationResult;
}

const GoalCard = ({ title, icon: Icon, goal, isActive = false }: { title: string, icon: React.ElementType, goal: GoalMacros, isActive?: boolean }) => {
    return (
        <Card className={`text-center transition-all ${isActive ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center justify-center gap-2">
                    <Icon className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <p className="text-3xl font-bold">{goal.calories}<span className="text-base font-normal"> kcal</span></p>
                <div className={`grid grid-cols-3 gap-2 mt-3 text-xs p-2 rounded-lg ${isActive ? 'bg-primary-foreground/20' : 'bg-secondary'}`}>
                    <div className="flex flex-col items-center">
                        <EggFried className={`h-4 w-4 ${isActive ? 'text-amber-300' : 'text-amber-600'}`} />
                        <span className="font-bold">{goal.protein}g</span>
                        <span>Prot.</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Wheat className={`h-4 w-4 ${isActive ? 'text-yellow-300' : 'text-yellow-500'}`} />
                        <span className="font-bold">{goal.carbs}g</span>
                        <span>Carbs</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Droplets className={`h-4 w-4 ${isActive ? 'text-sky-300' : 'text-sky-500'}`} />
                        <span className="font-bold">{goal.fat}g</span>
                        <span>Grasa</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function TargetGoalsDisplay({ result }: TargetGoalsDisplayProps) {
    if (!result) return null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Target className="h-6 w-6 text-primary" />
                    <CardTitle>Tus Objetivos Nutricionales</CardTitle>
                </div>
                <CardDescription>Estos son tus objetivos diarios calculados. Úsalos como guía para planificar tu semana.</CardDescription>
            </CardHeader>
            <CardContent>
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
