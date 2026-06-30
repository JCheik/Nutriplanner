'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookHeart, ShoppingCart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

export function MobileNav() {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // The assistant isn't a page — it's a dialog. Tapping it routes to the planner
  // with ?assistant=1, which the plan page reads to open the assistant (and then
  // cleans the URL). Objetivos moved to a button on the plan screen.
  const navItems = [
    { href: `/mobile`, label: 'Plan', icon: Home, isAssistant: false },
    { href: `/mobile/recipes`, label: 'Recetas', icon: BookHeart, isAssistant: false },
    { href: `/mobile/shopping-list`, label: 'Compra', icon: ShoppingCart, isAssistant: false },
    { href: `/mobile?assistant=1`, label: 'Asistente IA', icon: Sparkles, isAssistant: true },
  ];

  const isMobileRoute = pathname.startsWith('/mobile');

  if (!isMobile || !isMobileRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-50">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto">
        {navItems.map((item) => {
          const isActive = !item.isAssistant && pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-2 hover:bg-muted group",
                // The assistant is the hero AI feature: always tinted with the brand
                // colour so it reads as special, not just another tab.
                item.isAssistant ? "text-primary" : isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 mb-1", item.isAssistant && "fill-primary/10")} />
              <span className="text-[11px] leading-none text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
