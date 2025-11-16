import type { Macros } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Flame, EggFried, Wheat, Droplets } from 'lucide-react';

interface NutritionTotalsTooltipProps {
  totals: Macros;
}

export function NutritionTotalsTooltip({ totals }: NutritionTotalsTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="cursor-default">
            {Math.round(totals.calories)} kcal
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Flame className="h-4 w-4 text-orange-500" /> Calories
            </div>
            <div className="text-right">{Math.round(totals.calories)} kcal</div>

            <div className="flex items-center gap-2 font-medium">
              <EggFried className="h-4 w-4 text-amber-600" /> Protein
            </div>
            <div className="text-right">{Math.round(totals.protein)} g</div>

            <div className="flex items-center gap-2 font-medium">
              <Wheat className="h-4 w-4 text-yellow-500" /> Carbs
            </div>
            <div className="text-right">{Math.round(totals.carbs)} g</div>

            <div className="flex items-center gap-2 font-medium">
              <Droplets className="h-4 w-4 text-sky-500" /> Fat
            </div>
            <div className="text-right">{Math.round(totals.fat)} g</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
