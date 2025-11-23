'use client';

import { useState } from 'react';
import type { DayPlan } from '@/lib/types';
import { Logo } from '@/components/icons/logo';
import { ShoppingListContent, type ShoppingListItem } from '@/components/nutri-planner/shopping-list-content';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { usePlannerState } from '@/hooks/use-planner-state';

type PlannerState = ReturnType<typeof usePlannerState>;


const generateListFromPlan = (weekPlan: DayPlan[]): ShoppingListItem[] => {
    const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
    weekPlan.forEach(dayPlan => {
      (dayPlan.meals || []).forEach(meal => {
        (meal.recipes || []).forEach(recipe => {
          (recipe.ingredients || []).forEach(ingredient => {
            const key = `${ingredient.name.toLowerCase().trim()}-${ingredient.unit}`;
            if (aggregated[key]) {
              aggregated[key].quantity += ingredient.quantity;
            } else {
              aggregated[key] = { ...ingredient };
            }
          });
        });
      });
    });
     return Object.values(aggregated).map((item, index) => ({
      ...item,
      id: `gen-${index}`,
      checked: false,
    })).sort((a, b) => a.name.localeCompare(b.name));
};

export function MobileShoppingListPageContent({ currentWeekPlan, isLoading, isGuestMode }: PlannerState) {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  
  const handleGenerateList = () => {
    const newList = generateListFromPlan(currentWeekPlan);
    setShoppingList(newList);
  };

  if (isLoading && !isGuestMode) {
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando lista...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full bg-notebook-paper">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold font-headline">Lista de la Compra</h1>
        <div className="flex items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <RefreshCw className="h-6 w-6" />
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Sobrescribir lista actual?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción reemplazará la lista actual con los ingredientes de tu plan de comidas. Los artículos que hayas añadido manualmente se perderán.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleGenerateList}>Sí, generar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
      <ShoppingListContent initialList={shoppingList} onListChange={setShoppingList} />
    </div>
  );
}
