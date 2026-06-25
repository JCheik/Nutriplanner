'use client';

import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';
import { useOnboardingFlag } from '@/hooks/use-onboarding';

/**
 * Wraps a feature element and shows a one-time contextual tip the first time the
 * user sees it. The tip is anchored to the wrapped element and never steals focus
 * (so it doesn't fight modals/forms). "Entendido" dismisses it forever.
 */
export function FeatureHint({
  id,
  title,
  text,
  side = 'bottom',
  align = 'center',
  children,
}: {
  id: string;
  title: string;
  text: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  children: ReactNode;
}) {
  const { shouldShow, dismiss, dismissForever } = useOnboardingFlag(id);

  return (
    <Popover open={shouldShow} onOpenChange={(open) => { if (!open) dismiss(); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-72 bg-glass"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex gap-2">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{text}</p>
            <div className="flex justify-end">
              <Button size="sm" className="h-7 text-xs" onClick={() => dismissForever()}>
                Entendido
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
