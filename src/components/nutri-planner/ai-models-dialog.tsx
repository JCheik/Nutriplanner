'use client';

import type { ListModelsOutput } from '@/ai/flows/list-models';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';

interface AiModelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  modelsInfo: ListModelsOutput;
}

export function AiModelsDialog({ isOpen, onClose, modelsInfo }: AiModelsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modelos de IA Disponibles</DialogTitle>
          <DialogDescription>
            Esta es la lista de modelos de IA que tu configuración puede utilizar actualmente.
            El modelo utilizado para las sugerencias está definido en
            {' '}
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                src/ai/genkit.ts
            </code>
            .
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
