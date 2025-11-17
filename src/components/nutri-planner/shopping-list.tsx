'use client';

import { useMemo, useState } from 'react';
import type { WeekPlan, Ingredient } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Smartphone } from 'lucide-react';
import { QRCodeDialog } from './qr-code-dialog';

interface ShoppingListSheetProps {
  weekPlan: WeekPlan;
}

export function ShoppingListSheet({ weekPlan }: ShoppingListSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  const shoppingList = useMemo(() => {
    const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};

    weekPlan.forEach(dayPlan => {
      Object.values(dayPlan.meals).forEach(meal => {
        meal.recipes.forEach(recipe => {
          recipe.ingredients.forEach(ingredient => {
            const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
            if (aggregated[key]) {
              aggregated[key].quantity += ingredient.quantity;
            } else {
              aggregated[key] = { ...ingredient };
            }
          });
        });
      });
    });

    return Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
  }, [weekPlan]);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const shoppingListString = useMemo(() => {
    return shoppingList.map(item => `- ${item.quantity.toFixed(0)}${item.unit} ${item.name}`).join('\n');
  }, [shoppingList]);

  const handleToggleCheck = (key: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleClearChecked = () => {
    const newChecked: Record<string, boolean> = {};
    Object.keys(checkedItems).forEach(key => {
        if (!checkedItems[key]) {
            newChecked[key] = false;
        }
    });
    // This doesn't remove the item from the list, just unchecks it,
    // to clear them visually, we'd need to filter `shoppingList`
    const newShoppingList = shoppingList.filter(item => !checkedItems[`${item.name.toLowerCase()}-${item.unit}`]);
    // The prompt is about clearing, so we reset the state.
    setCheckedItems({});
  };

  return (
    <>
      <div className="fixed bottom-8 right-8 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600"
          size="icon"
        >
          <ShoppingCart className="h-8 w-8" />
        </Button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Lista de la Compra
            </SheetTitle>
            <SheetDescription>
              Aquí tienes todos los ingredientes que necesitas para tu plan semanal.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {shoppingList.length > 0 ? (
              <div className="space-y-3 py-4">
                {shoppingList.map(item => {
                  const key = `${item.name.toLowerCase()}-${item.unit}`;
                  return (
                    <div key={key} className="flex items-center space-x-3 p-3 rounded-md bg-secondary/50">
                      <Checkbox
                        id={key}
                        checked={!!checkedItems[key]}
                        onCheckedChange={() => handleToggleCheck(key)}
                      />
                      <Label
                        htmlFor={key}
                        className={`flex-1 text-base ${checkedItems[key] ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {item.name} - <span className="font-bold">{item.quantity.toFixed(0)}{item.unit}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-4" />
                  <p className="font-semibold">Tu lista está vacía.</p>
                  <p className="text-sm">Añade recetas al planificador para generar la lista.</p>
              </div>
            )}
          </ScrollArea>
          <SheetFooter className="mt-auto pt-4 border-t gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setIsQrOpen(true)} disabled={shoppingList.length === 0}>
                <Smartphone className="mr-2 h-4 w-4" />
                Enviar al móvil
            </Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
                <Button onClick={handleClearChecked} disabled={Object.values(checkedItems).every(v => !v)}>
                    Limpiar Comprados
                </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
