'use client';
import { useState } from 'react';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { listAvailableModels, type ListModelsOutput } from '@/ai/flows/list-models';
import { AiModelsDialog } from '@/components/nutri-planner/ai-models-dialog';
import { Loader2 } from 'lucide-react';

export function PageHeader() {
  const [modelsInfo, setModelsInfo] = useState<ListModelsOutput | null>(null);
  const [isModelsDialogOpen, setIsModelsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckModels = async () => {
    setIsLoading(true);
    try {
      const result = await listAvailableModels();
      setModelsInfo(result);
      setIsModelsDialogOpen(true);
    } catch (error) {
      console.error('Failed to list AI models:', error);
      // You could add a toast here to notify the user of the failure.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold tracking-tight text-foreground">
                NutriPlanner
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleCheckModels} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verificar Modelos de IA
              </Button>
            </div>
          </div>
        </div>
      </header>
      {modelsInfo && (
        <AiModelsDialog
          isOpen={isModelsDialogOpen}
          onClose={() => setIsModelsDialogOpen(false)}
          modelsInfo={modelsInfo}
        />
      )}
    </>
  );
}
