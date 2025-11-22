'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookHeart, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/mobile', label: 'Plan', icon: Home },
  { href: '/mobile/recipes', label: 'Recetas', icon: BookHeart },
  { href: '/mobile/shopping-list', label: 'Compra', icon: ShoppingCart },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-50">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted group",
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
