'use client';

import { useState, useRef, useEffect } from 'react';
import { parseFridgeImage } from '@/ai/flows/parse-fridge-image-flow';
import { getAiErrorMessage } from '@/lib/ai-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  Loader2, 
  Flame, 
  EggFried, 
  Wheat, 
  Droplets, 
  Plus, 
  Bookmark, 
  Eye, 
  ChevronRight,
  UtensilsCrossed,
  Check
} from 'lucide-react';
import type { Recipe, GoalMacros } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface EmptyFridgeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeAction: (action: 'view' | 'create' | 'edit', recipe?: Recipe, isNutriPlannerRecipe?: boolean) => void;
  nutritionalGoal: GoalMacros | null;
  onSaveRecipe: (recipe: Omit<Recipe, 'id'>, imageFile: File | null, isGlobal: boolean) => Promise<void>;
  isSavingRecipe?: boolean;
}

export function EmptyFridgeScanner({
  isOpen,
  onClose,
  onRecipeAction,
  nutritionalGoal,
  onSaveRecipe,
  isSavingRecipe = false,
}: EmptyFridgeScannerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Scanned Results
  const [scannedIngredients, setScannedIngredients] = useState<string[]>([]);
  const [suggestedRecipes, setSuggestedRecipes] = useState<any[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Record<string, boolean>>({});
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const resetScanner = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    setIsScanning(false);
    setScannedIngredients([]);
    setSuggestedRecipes([]);
    setHasScanned(false);
    setSavedRecipeIds({});
    setSavingIndex(null);
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Formato no soportado',
        description: 'Por favor, selecciona una imagen (PNG, JPG, WEBP).',
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    
    // Create local object URL for instant preview
    setImagePreview(URL.createObjectURL(file));

    // Convert to base64 Data URL for Genkit direct transmission
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleScan = async () => {
    if (!imageBase64) return;
    setIsScanning(true);
    setHasScanned(false);

    try {
      const result = await parseFridgeImage({
        imageBase64,
        nutritionalGoal,
      });

      if (result) {
        setScannedIngredients(result.ingredients || []);
        setSuggestedRecipes(result.recipes || []);
        setHasScanned(true);
        toast({
          title: '¡Escaneo completado!',
          description: `Se detectaron ${result.ingredients.length} ingredientes y se generaron 3 recetas.`,
        });
      } else {
        throw new Error('No se recibió respuesta del servidor de IA.');
      }
    } catch (error) {
      console.error('Error scanning fridge image:', error);
      toast({
        variant: 'destructive',
        title: 'Error al escanear',
        description: getAiErrorMessage(error, 'Ocurrió un problema al procesar la imagen de tu nevera. Por favor, intenta de nuevo.'),
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveSuggestedRecipe = async (recipe: any, index: number) => {
    setSavingIndex(index);
    try {
      const recipeToSave: Omit<Recipe, 'id'> = {
        name: recipe.name,
        description: recipe.description,
        instructions: recipe.instructions,
        ingredients: recipe.ingredients,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        imageHint: recipe.imageHint,
      };

      await onSaveRecipe(recipeToSave, null, false);
      setSavedRecipeIds(prev => ({ ...prev, [index]: true }));
    } catch (err) {
      console.error('Error saving recipe:', err);
    } finally {
      setSavingIndex(null);
    }
  };

  const handleOpenRecipeDetail = (recipe: any) => {
    // Pre-fill the recipe structure to look like a full Recipe object for the view mode dialog
    const recipeDetail: Recipe = {
      id: `suggested-${Date.now()}`,
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      ingredients: recipe.ingredients,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      imageHint: recipe.imageHint,
    };
    onRecipeAction('view', recipeDetail, false);
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes laserScan {
          0% { top: 0%; opacity: 0.1; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0.1; }
        }
        .laser-scan-line {
          animation: laserScan 2s infinite linear;
        }
      `}</style>

      <div className={cn(
        'fixed bottom-24 right-8 w-[420px] rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out z-50 origin-bottom-right bg-glass border flex flex-col',
        'h-[75vh] max-h-[640px]',
        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
      )}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary"/>
            Escanear Nevera Vacía
          </h2>
          <div className="flex items-center gap-1">
            {(imagePreview || hasScanned) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={resetScanner}
                disabled={isScanning}
              >
                Reiniciar
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              
              {/* Step 1: Upload or capture */}
              {!imagePreview && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300",
                    dragActive 
                      ? "border-primary bg-primary/5 scale-[0.98]" 
                      : "border-muted hover:border-primary/50 hover:bg-secondary/20"
                  )}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  />
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Sube una foto de tu nevera</h3>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Arrastra tu foto aquí o haz clic para buscar en tus archivos.
                  </p>
                </div>
              )}

              {/* Image Preview & Scanner line overlay */}
              {imagePreview && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                  {isScanning && (
                    <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_#3b82f6] laser-scan-line z-10" />
                  )}
                  
                  {!isScanning && !hasScanned && (
                    <button
                      onClick={resetScanner}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Action Scan Button */}
              {imagePreview && !hasScanned && (
                <Button 
                  className="w-full" 
                  onClick={handleScan} 
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analizando ingredientes y recetas...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Escanear con IA
                    </>
                  )}
                </Button>
              )}

              {/* Step 2: Scanned results (Ingredients & Recipes) */}
              {hasScanned && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  
                  {/* Ingredients Badge list */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Ingredientes Detectados ({scannedIngredients.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {scannedIngredients.length > 0 ? (
                        scannedIngredients.map((ingredient, i) => (
                          <span 
                            key={i} 
                            className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-medium border border-primary/20 capitalize"
                          >
                            {ingredient}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No se detectaron ingredientes específicos.</span>
                      )}
                    </div>
                  </div>

                  {/* Recipe Suggestions */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Recetas Recomendadas
                    </h3>
                    <div className="space-y-3">
                      {suggestedRecipes.map((recipe, index) => (
                        <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow bg-card/50 border">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-sm text-foreground line-clamp-1">{recipe.name}</h4>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenRecipeDetail(recipe)}
                                  title="Ver receta"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-7 w-7 transition-colors",
                                    savedRecipeIds[index] 
                                      ? "text-emerald-500 hover:text-emerald-600 bg-emerald-50" 
                                      : "text-muted-foreground hover:text-primary"
                                  )}
                                  onClick={() => !savedRecipeIds[index] && handleSaveSuggestedRecipe(recipe, index)}
                                  title={savedRecipeIds[index] ? "Guardado" : "Guardar en mis recetas"}
                                  disabled={savingIndex !== null}
                                >
                                  {savingIndex === index ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  ) : savedRecipeIds[index] ? (
                                    <Check className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            
                            <p className="text-xs text-muted-foreground line-clamp-2 my-1.5 leading-relaxed">
                              {recipe.description}
                            </p>

                            <div className="flex justify-between text-muted-foreground text-[10px] bg-secondary/30 p-1.5 rounded-md mt-1">
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-orange-400" />
                                <span className="font-medium text-foreground">{recipe.calories}</span> kcal
                              </span>
                              <span className="flex items-center gap-1">
                                <EggFried className="h-3 w-3 text-amber-400" />
                                <span className="font-medium text-foreground">{recipe.protein}g</span> prot
                              </span>
                              <span className="flex items-center gap-1">
                                <Wheat className="h-3 w-3 text-yellow-400" />
                                <span className="font-medium text-foreground">{recipe.carbs}g</span> carb
                              </span>
                              <span className="flex items-center gap-1">
                                <Droplets className="h-3 w-3 text-sky-400" />
                                <span className="font-medium text-foreground">{recipe.fat}g</span> grasa
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
