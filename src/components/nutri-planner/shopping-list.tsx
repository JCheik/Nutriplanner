'use client';

import type { WeekPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShoppingListContent, type ShoppingListItem } from './shopping-list-content';
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

interface ShoppingListSheetProps {
  weekPlan: WeekPlan;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentShoppingList: ShoppingListItem[];
  onListChange: (list: ShoppingListItem[]) => void;
}

const generateListFromPlan = (weekPlan: WeekPlan): ShoppingListItem[] => {
    const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
    if (!weekPlan) return [];
    
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

export function ShoppingListSheet({ weekPlan, isOpen, onOpenChange, currentShoppingList, onListChange }: ShoppingListSheetProps) {

    const handleGenerateList = () => {
        const newList = generateListFromPlan(weekPlan);
        onListChange(newList);
    }

  return (
    <>
        <div 
            className={cn(
                'fixed bottom-24 right-8 w-[420px] rounded-lg shadow-2xl p-6 transform transition-all duration-300 ease-in-out z-50 origin-bottom-right flex flex-col h-[75vh] border border-primary/20 bg-notebook-paper',
                isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
            )}
        >
            <div className="flex justify-between items-center -mt-2 mb-2">
                <h2 className="text-xl font-headline text-foreground/90 flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6 text-primary"/>
                    Lista de la Compra
                </h2>
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generar desde el Plan
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
            
            <ShoppingListContent list={currentShoppingList} onListChange={onListChange} />
        </div>
    </>
  );
}
