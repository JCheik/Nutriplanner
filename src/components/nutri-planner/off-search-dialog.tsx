'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ScanBarcode, LoaderCircle, PackageSearch, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchOffProducts, getOffProductByBarcode, type OffProduct } from '@/lib/open-food-facts';
import { BarcodeScannerDialog } from './barcode-scanner-dialog';

interface OffSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the chosen product; the caller decides what to do with it. */
  onSelect: (product: OffProduct) => void;
  /** Optional context line shown under the title. */
  description?: string;
}

/**
 * Search Open Food Facts by name or barcode and pick a product. Shared by the
 * food diary (log what you ate) and the ingredient editor (create a base
 * ingredient with verified per-100g macros).
 */
export function OffSearchDialog({ isOpen, onClose, onSelect, description }: OffSearchDialogProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OffProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const runSearch = async () => {
    const q = query.trim();
    if (!q || isLoading) return;
    setIsLoading(true);
    try {
      // A query that is all digits is almost certainly a barcode.
      if (/^\d{6,}$/.test(q)) {
        const product = await getOffProductByBarcode(q);
        setResults(product ? [product] : []);
      } else {
        setResults(await searchOffProducts(q));
      }
      setHasSearched(true);
    } catch (e) {
      console.error('OFF search failed:', e);
      toast({
        variant: 'destructive',
        title: 'Buscador no disponible',
        description: 'Open Food Facts no responde ahora mismo. Escanea el código de barras o añádelo a mano.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcode = async (barcode: string) => {
    setIsLoading(true);
    try {
      const product = await getOffProductByBarcode(barcode);
      if (product) {
        onSelect(product);
        onClose();
      } else {
        setQuery(barcode);
        setResults([]);
        setHasSearched(true);
        toast({
          title: 'Producto no encontrado',
          description: `El código ${barcode} no está en Open Food Facts. Puedes añadirlo a mano.`,
        });
      }
    } catch (e) {
      console.error('OFF barcode lookup failed:', e);
      toast({
        variant: 'destructive',
        title: 'Open Food Facts no responde',
        description: 'Inténtalo de nuevo en unos segundos.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-md h-[85dvh] flex flex-col bg-glass">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-primary" />
              Buscar alimento
            </DialogTitle>
            <DialogDescription>
              {description ?? 'Busca en Open Food Facts por nombre o escanea el código de barras.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ej: yogur griego, avena…"
                className="pl-10"
                onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
              />
            </div>
            <Button onClick={runSearch} disabled={!query.trim() || isLoading} className="shrink-0">
              {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>

          <Button variant="outline" className="shrink-0" onClick={() => setIsScannerOpen(true)}>
            <ScanBarcode className="mr-2 h-4 w-4" />
            Escanear código de barras
          </Button>

          <ScrollArea className="flex-1 -mx-6">
            <div className="px-6 space-y-2 pb-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <LoaderCircle className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Buscando…</p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
                  <PackageSearch className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm">
                    {hasSearched
                      ? 'Sin resultados con datos nutricionales. Prueba otro término.'
                      : 'Busca un producto o escanea su código de barras.'}
                  </p>
                </div>
              ) : (
                results.map((product, i) => (
                  <button
                    key={product.barcode ?? `${product.name}-${i}`}
                    onClick={() => { onSelect(product); onClose(); }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg border bg-card text-left hover:border-primary/50 transition-colors"
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-12 w-12 rounded-md object-cover bg-secondary shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center shrink-0">
                        <PackageSearch className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight line-clamp-2">{product.name}</p>
                      {product.brand && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{product.brand}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                      <Flame className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-xs font-semibold">
                        {Math.round(product.per100g.calories)}
                        <span className="font-normal"> kcal/100g</span>
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <p className="text-[10px] text-muted-foreground text-center shrink-0">
            Datos de Open Food Facts (base de datos abierta y colaborativa).
          </p>
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleBarcode}
      />
    </>
  );
}
