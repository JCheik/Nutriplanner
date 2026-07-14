'use client';

import { useState } from 'react';
import { ShoppingListContent } from '@/components/nutri-planner/shopping-list-content';
import { generateShoppingListFromPlan } from '@/lib/shopping-list-utils';
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

import type { useWeekPlanState } from '@/hooks/use-week-plan-state';
import type { useUserProfileState } from '@/hooks/use-user-profile-state';

type CombinedState = ReturnType<typeof useWeekPlanState> & ReturnType<typeof useUserProfileState>;

interface MobileShoppingListPageContentProps extends CombinedState {}

export function MobileShoppingListPageContent({ currentWeekPlan, currentShoppingList, handleShoppingListUpdate }: MobileShoppingListPageContentProps) {

  const handleGenerateList = () => {
    if(!currentWeekPlan) return;
    const newList = generateShoppingListFromPlan(currentWeekPlan);
    handleShoppingListUpdate(newList);
  };

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
      <ShoppingListContent list={currentShoppingList} onListChange={handleShoppingListUpdate} />
    </div>
  );
}
