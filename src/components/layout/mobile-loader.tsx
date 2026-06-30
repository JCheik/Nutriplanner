'use client';

import { Logo } from '@/components/icons/logo';

/**
 * Single, brand-consistent loading screen for every mobile route. Fills its
 * container with the same warm cream + dotted texture the app uses, so the
 * loaders no longer clash with the planner's look (previously each page had its
 * own ad-hoc spinner on a plain background). Pass `label` to tailor the message.
 */
export function MobileLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div
      className="flex h-full w-full min-h-[60vh] flex-col items-center justify-center gap-3"
      style={{
        background: '#F7F3EC',
        backgroundImage: 'radial-gradient(circle, rgba(217,160,136,0.25) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    >
      <Logo className="h-14 w-14 text-primary animate-pulse" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
