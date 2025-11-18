'use client';

import type { ListModelsOutput } from '@/ai/flows/list-models';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { BaseIngredient } from '@/lib/types';
import { collection } from 'firebase/firestore';

interface AiModelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  modelsInfo: ListModelsOutput;
}

function IngredientDatabaseViewer() {
    const firestore = useFirestore();
    const ingredientsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'ingredients') : null, [firestore]);
    const { data: ingredients, isLoading } = useCollection<BaseIngredient>(ingredientsCollectionRef);

    return (
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Calorías</TableHead>
                <TableHead className="text-right">Proteína (g)</TableHead>
                <TableHead className="text-right">Carbs (g)</TableHead>
                <TableHead className="text-right">Grasa (g)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">Cargando ingredientes...</TableCell>
                </TableRow>
              )}
              {ingredients?.map((ingredient) => (
                <TableRow key={ingredient.id}>
                  <TableCell className="font-medium">{ingredient.name}</TableCell>
                  <TableCell className="text-right">{ingredient.calories}</TableCell>
                  <TableCell className="text-right">{ingredient.protein}</TableCell>
                  <TableCell className="text-right">{ingredient.carbs}</TableCell>
                  <TableCell className="text-right">{ingredient.fat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
    )
}

export function AiModelsDialog({ isOpen, onClose, modelsInfo }: AiModelsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Verificar Configuración</DialogTitle>
          <DialogDescription>
            Aquí puedes verificar la configuración de la IA y el estado de la base de datos.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="ai-models">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai-models">Modelos de IA</TabsTrigger>
                <TabsTrigger value="ingredients-db">Ingredientes en Firestore</TabsTrigger>
            </TabsList>
            <TabsContent value="ai-models" className="mt-4">
                 <p className="text-sm text-muted-foreground mb-4">
                    Esta es la lista de modelos de IA que tu configuración puede utilizar. El modelo de sugerencias se define en{' '}
                    <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        src/ai/genkit.ts
                    </code>
                    .
                 </p>
                <ScrollArea className="max-h-[60vh]">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre del Modelo</TableHead>
                        <TableHead>Soporte</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {modelsInfo.models.map((model) => (
                        <TableRow key={model.name}>
                        <TableCell className="font-medium">
                            {model.label}
                            <div className="text-xs text-muted-foreground">{model.name}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline">{model.supports}</Badge>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="ingredients-db" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                    Esta tabla muestra los datos actuales de la colección <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">/ingredients</code> en Firestore.
                </p>
                <IngredientDatabaseViewer />
            </TabsContent>
        </Tabs>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
