'use client';

import { useMemo, useState } from 'react';
import type { WeekPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Smartphone, X } from 'lucide-react';
import { QRCodeDialog } from './qr-code-dialog';
import { cn } from '@/lib/utils';
import { ShoppingListContent } from './shopping-list-content';

interface ShoppingListSheetProps {
  weekPlan: WeekPlan;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ShoppingListSheet({ weekPlan, isOpen, onOpenChange }: ShoppingListSheetProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const shoppingListString = useMemo(() => {
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
    const list = Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
    return list.map(item => `- ${item.quantity.toFixed(0)}${item.unit} ${item.name}`).join('\n');
  }, [weekPlan]);


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
                        onClick={() => setIsQrOpen(true)}
                        disabled={!shoppingListString}
                    >
                        <Smartphone className="h-5 w-5" />
                    </Button>
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
            <ShoppingListContent weekPlan={weekPlan} />
        </div>
        <QRCodeDialog
            isOpen={isQrOpen}
            onClose={() => setIsQrOpen(false)}
            qrValue={shoppingListString}
            title="Escanea para llevarte la lista"
            description="Abre la cámara de tu móvil y apunta al código QR para ver la lista de la compra."
        />
    </>
  );
}
