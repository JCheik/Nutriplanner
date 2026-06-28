'use client';

import { useState } from 'react';
import type { DayPlan, WeekHistoryEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { History, X, Save, RotateCcw, Trash2, CalendarClock, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';

interface WeekHistorySheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  weekPlan: DayPlan[];
  history: WeekHistoryEntry[];
  isLoading: boolean;
  onSave: (label: string, days: DayPlan[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (days: DayPlan[]) => void;
}

/** Total recipes across a snapshot's days — a quick "how full was this week". */
function countRecipes(days: DayPlan[]): number {
  return days.reduce(
    (sum, d) => sum + (d.meals ?? []).reduce((s, m) => s + (m.recipes?.length ?? 0), 0),
    0
  );
}

export function WeekHistorySheet({
  isOpen,
  onOpenChange,
  weekPlan,
  history,
  isLoading,
  onSave,
  onDelete,
  onRestore,
}: WeekHistorySheetProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const currentRecipeCount = countRecipes(weekPlan);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const label = `Semana del ${format(new Date(), "d 'de' MMM yyyy", { locale: es })}`;
      await onSave(label, weekPlan);
      toast({ title: 'Semana guardada', description: 'Tu plan se ha archivado en el historial.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la semana.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = (entry: WeekHistoryEntry) => {
    onRestore(entry.days);
    toast({ title: 'Semana cargada', description: `Se ha aplicado "${entry.label}" a tu planificador.` });
    onOpenChange(false);
  };

  const handleDelete = async (entry: WeekHistoryEntry) => {
    try {
      await onDelete(entry.id);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo borrar la semana.' });
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-24 right-8 w-[420px] h-[75vh] rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out z-50 origin-bottom-right bg-glass border flex flex-col',
        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
      )}
    >
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Historial de semanas
        </h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 border-b">
        <Button className="w-full" onClick={handleSave} disabled={isSaving || currentRecipeCount === 0}>
          {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar semana actual
        </Button>
        {currentRecipeCount === 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Tu plan está vacío. Añade recetas para poder guardarlo.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
            <CalendarClock className="h-8 w-8 mb-2" />
            <p className="text-sm">Aún no has guardado ninguna semana.</p>
            <p className="text-xs mt-1">Guarda tu plan para reutilizarlo más adelante.</p>
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="rounded-lg border bg-background p-3 space-y-2">
              <div>
                <p className="font-medium text-sm leading-tight">{entry.label}</p>
                <p className="text-xs text-muted-foreground">
                  {countRecipes(entry.days)} recetas · guardada {format(new Date(entry.savedAt), "d MMM, HH:mm", { locale: es })}
                </p>
              </div>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                      <RotateCcw className="mr-1.5 h-3 w-3" />
                      Cargar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-glass">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cargar esta semana?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se reemplazará tu plan actual con «{entry.label}». Guarda la semana actual antes si no
                        quieres perderla.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRestore(entry)}>Sí, cargar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      aria-label="Borrar semana guardada"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-glass">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Borrar del historial?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se eliminará «{entry.label}» de forma permanente. Tu plan actual no se verá afectado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(entry)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Sí, borrar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
