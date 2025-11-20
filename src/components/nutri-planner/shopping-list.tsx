'use client';

import { useMemo, useState, useEffect } from 'react';
import type { WeekPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Smartphone, PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import { QRCodeDialog } from './qr-code-dialog';
import { cn } from '@/lib/utils';


interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

interface ShoppingListProps {
  weekPlan: WeekPlan;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const ShoppingListContent = ({ weekPlan, className, onOpenQr }: { weekPlan: WeekPlan; className?: string; onOpenQr: () => void; }) => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);

  useEffect(() => {
    const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};

    weekPlan.forEach(dayPlan => {
      dayPlan.meals.forEach(meal => {
        meal.recipes.forEach(recipe => {
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

    const generatedList = Object.values(aggregated).map((item, index) => ({
      ...item,
      id: `gen-${index}`,
      checked: false,
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    setShoppingList(generatedList);
  }, [weekPlan]);

  const handleToggleCheck = (id: string) => {
    setShoppingList(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };
  
  const handleAddItem = () => {
    if (newItemName.trim()) {
      const newItem: ShoppingListItem = {
        id: `manual-${self.crypto.randomUUID()}`,
        name: newItemName.trim(),
        quantity: parseFloat(newItemQty) || 1,
        unit: '', // Manual items might not have a unit
        checked: false,
      };
      setShoppingList(prev => [...prev, newItem]);
      setNewItemName('');
      setNewItemQty('');
    }
  };
  
  const handleUpdateItem = () => {
    if (editingItem) {
        setShoppingList(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));
        setEditingItem(null);
    }
  };
  
  const handleDeleteItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };
  
  const handleEditClick = (item: ShoppingListItem) => {
    setEditingItem({...item});
  };

  return (
    <>
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex gap-2 items-end border-b-2 border-dashed border-primary/20 pb-4 mt-4">
          <div className="flex-grow">
            <Label htmlFor="new-item-name" className="text-xs font-sans text-muted-foreground">Añadir artículo</Label>
            <Input
              id="new-item-name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Nombre del artículo"
              className="bg-transparent border-0 border-b rounded-none px-1 focus-visible:ring-0"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="new-item-qty" className="text-xs font-sans text-muted-foreground">Cantidad</Label>
            <Input
              id="new-item-qty"
              type="text"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              placeholder="ej. 1, 200"
              className="bg-transparent border-0 border-b rounded-none px-1 focus-visible:ring-0"
            />
          </div>
          <Button size="icon" variant="ghost" onClick={handleAddItem} disabled={!newItemName.trim()} className="shrink-0 text-primary hover:text-primary">
            <PlusCircle />
          </Button>
        </div>
        <ScrollArea className="flex-1 my-4 -mx-6 px-6">
          {shoppingList.length > 0 ? (
            <div className="space-y-3 pr-4">
              {shoppingList.map(item => (
                <div key={item.id} className="flex items-center space-x-3 group">
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={() => handleToggleCheck(item.id)}
                    className="border-primary/50"
                  />
                  <div className="flex-1">
                    {editingItem?.id === item.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingItem.quantity}
                          type="number"
                          onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 0 })}
                          className="h-8 w-20 font-handwriting text-lg"
                        />
                        <Input
                          value={editingItem.name}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          className="h-8 font-handwriting text-lg"
                        />
                        <Button size="sm" onClick={handleUpdateItem}>Guardar</Button>
                      </div>
                    ) : (
                      <Label
                        htmlFor={item.id}
                        className={cn(
                          "text-lg font-handwriting text-foreground/80",
                          item.checked && 'line-through text-muted-foreground'
                        )}
                      >
                        <span className="font-bold">{item.quantity > 0 ? item.quantity.toFixed(0) : ''}{item.unit}</span> {item.name}
                      </Label>
                    )}
                  </div>
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4" />
              <p className="font-semibold font-sans">Tu lista está vacía.</p>
              <p className="text-sm font-sans">Los ingredientes del planificador aparecerán aquí.</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
};


export function ShoppingListSheet({ weekPlan, isOpen, onOpenChange }: ShoppingListProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const shoppingListString = useMemo(() => {
    const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
    weekPlan.forEach(dayPlan => {
      dayPlan.meals.forEach(meal => {
        meal.recipes.forEach(recipe => {
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
            <ShoppingListContent weekPlan={weekPlan} onOpenQr={() => setIsQrOpen(true)} />
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
