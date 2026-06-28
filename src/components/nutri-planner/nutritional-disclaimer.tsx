import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Standard "not medical advice" disclaimer. Shown wherever Nutrilp gives
 * calorie/macro guidance (goals, calculator) and on the welcome screen.
 */
export function NutritionalDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-1.5 text-xs text-muted-foreground', className)}>
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>
        Nutrilp ofrece estimaciones orientativas y no constituye consejo médico ni nutricional
        profesional. Consulta con un profesional de la salud antes de cambiar tu dieta.
      </span>
    </p>
  );
}
