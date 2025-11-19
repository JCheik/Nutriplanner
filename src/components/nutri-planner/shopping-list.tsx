'use client';

import { useMemo, useState, useEffect } from 'react';
import type { WeekPlan } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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

interface ShoppingListDialogProps {
  weekPlan: WeekPlan;
  isOpen: boolean;
  onToggle: () => void;
}

export function ShoppingListSheet({ weekPlan, isOpen, onToggle }: ShoppingListDialogProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};

      weekPlan.forEach(dayPlan => {
        dayPlan.meals.forEach(meal => {
          meal.recipes.forEach(recipe => {
            recipe.ingredients.forEach(ingredient => {
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
    }
  }, [weekPlan, isOpen]);


  const shoppingListString = useMemo(() => {
    return shoppingList.map(item => `- ${item.quantity.toFixed(0)}${item.unit} ${item.name}`).join('\n');
  }, [shoppingList]);

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
  
  const handleClearList = () => {
    setShoppingList([]);
  };

  const handleEditClick = (item: ShoppingListItem) => {
    setEditingItem({...item});
  };

  return (
    <>
      <div className="fixed bottom-8 right-8 z-40">
        <Button
          onClick={onToggle}
          className="h-16 w-16 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90"
          size="icon"
        >
          <ShoppingCart className="h-8 w-8" />
        </Button>
      </div>

       <Dialog open={isOpen} onOpenChange={onToggle}>
        <DialogContent 
          className={cn(
            'fixed bottom-8 right-28 w-96 rounded-lg shadow-2xl p-4 transform transition-all duration-300 ease-in-out z-50 origin-bottom-right flex flex-col h-[70vh] bg-glass',
            isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
          )}
          hideCloseButton
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Lista de la Compra
            </DialogTitle>
            <DialogDescription>
              Añade, edita y gestiona los ingredientes para tu plan semanal.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 items-end border-b border-white/10 pb-4 mt-4">
              <div className="flex-grow">
                <Label htmlFor="new-item-name" className="text-xs">Añadir artículo</Label>
                <Input
                  id="new-item-name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Nombre del artículo"
                />
              </div>
              <div className="w-24">
                <Label htmlFor="new-item-qty" className="text-xs">Cantidad</Label>
                <Input
                  id="new-item-qty"
                  type="text"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  placeholder="ej. 1, 200"
                />
              </div>
              <Button size="icon" onClick={handleAddItem} disabled={!newItemName.trim()}>
                <PlusCircle />
              </Button>
            </div>
            
          <ScrollArea className="flex-1 my-4">
            {shoppingList.length > 0 ? (
              <div className="space-y-2 pr-4">
                {shoppingList.map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-black/10">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={() => handleToggleCheck(item.id)}
                    />
                    <div className="flex-1">
                      {editingItem?.id === item.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingItem.quantity}
                            type="number"
                            onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-20"
                          />
                           <Input
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="h-8"
                          />
                          <Button size="sm" onClick={handleUpdateItem}>Guardar</Button>
                        </div>
                      ) : (
                        <Label
                          htmlFor={item.id}
                          className={`text-base ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                        >
                          <span className="font-bold">{item.quantity.toFixed(0)}{item.unit}</span> - {item.name}
                        </Label>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-4" />
                  <p className="font-semibold">Tu lista está vacía.</p>
                  <p className="text-sm">Los ingredientes del planificador aparecerán aquí.</p>
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="mt-auto pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
             <Button variant="secondary" onClick={() => setIsQrOpen(true)} disabled={shoppingList.length === 0} className="col-span-1">
                <Smartphone className="mr-2 h-4 w-4" />
                Generar QR
            </Button>
            <Button onClick={onToggle} className="col-span-1">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

    