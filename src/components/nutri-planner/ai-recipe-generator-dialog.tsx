'use client';

import { useState } from 'react';
import { generateRecipe, type RecipeGenerationOutput } from '@/ai/flows/recipe-generator-flow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Recipe } from '@/lib/types';


interface AiRecipeGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeGenerated: (recipe: Omit<Recipe, 'id'>) => void;
}

export function AiRecipeGeneratorDialog({ isOpen, onClose, onRecipeGenerated }: AiRecipeGeneratorDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
        toast({
            variant: 'destructive',
            title: 'Petición vacía',
            description: 'Por favor, describe la receta que quieres generar.',
        });
        return;
    }

    setIsLoading(true);
    try {
        const generatedData = await generateRecipe({ prompt });
        onRecipeGenerated(generatedData); // Pass the generated data up
        onClose(); // Close this dialog
    } catch (error) {
        console.error('Failed to generate recipe:', error);
        toast({
            variant: 'destructive',
            title: 'Error de IA',
            description: 'No se pudo generar la receta. Por favor, intenta de nuevo.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Generador de Recetas con IA
          </DialogTitle>
          <DialogDescription>
            Describe la receta que tienes en mente y la IA la creará por ti, incluyendo ingredientes, instrucciones y macros.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="prompt">¿Qué te apetece cocinar hoy?</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Una cena rápida y alta en proteínas con pollo y brócoli, estilo asiático."
            className="mt-2 min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Receta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
