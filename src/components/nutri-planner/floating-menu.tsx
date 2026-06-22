'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Target, ShoppingCart, StickyNoteIcon, Sparkles, Camera, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementType } from 'react';
import type { PanelType } from '@/lib/types';

interface FloatingMenuProps {
  onPanelOpen: (panel: PanelType) => void;
}

const menuItems: { panel: PanelType; icon: ElementType; label: string; color: string }[] = [
  { panel: 'goals', icon: Target, label: 'Objetivos', color: 'bg-primary hover:bg-primary/90 text-primary-foreground' },
  { panel: 'shopping-list', icon: ShoppingCart, label: 'Compra', color: 'bg-accent hover:bg-accent/90 text-accent-foreground' },
  { panel: 'sticky-note', icon: StickyNoteIcon, label: 'Notas', color: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground' },
  { panel: 'ai-chat', icon: Sparkles, label: 'Asistente IA', color: 'bg-blue-500 hover:bg-blue-500/90 text-white' },
  { panel: 'empty-fridge', icon: Camera, label: 'Escanear Nevera', color: 'bg-emerald-500 hover:bg-emerald-500/90 text-white' },
  { panel: 'recipe-import', icon: Link2, label: 'Importar URL', color: 'bg-violet-500 hover:bg-violet-500/90 text-white' },
];

export function FloatingMenu({ onPanelOpen }: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => setIsOpen(prev => !prev);

  const handleItemClick = (panel: PanelType) => {
    onPanelOpen(panel);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[60]" data-tour="floating-menu">
      <div className="relative flex flex-col items-end gap-3">
        {/* Action Items */}
        {menuItems.map((item, index) => (
          <div
            key={item.panel}
            className={cn(
              'transition-all duration-300 ease-in-out flex items-center justify-end gap-3',
              isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            )}
            style={{ transitionDelay: isOpen ? `${(menuItems.length - 1 - index) * 50}ms` : `${index * 50}ms` }}
          >
            <span className="bg-card/80 backdrop-blur-sm text-card-foreground text-sm px-3 py-1 rounded-md shadow-lg">
              {item.label}
            </span>
            <Button
              onClick={() => handleItemClick(item.panel)}
              className={cn('h-14 w-14 rounded-full shadow-lg', item.color)}
              size="icon"
              aria-label={item.label}
            >
              <item.icon className="h-7 w-7" />
            </Button>
          </div>
        ))}

        {/* Main Toggle Button */}
        <Button
          onClick={handleToggle}
          className="h-16 w-16 rounded-full shadow-xl bg-card text-card-foreground hover:bg-card/90"
          size="icon"
          aria-expanded={isOpen}
        >
          <Plus className={cn('h-8 w-8 transition-transform duration-300', isOpen && 'rotate-45')} />
          <span className="sr-only">{isOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
        </Button>
      </div>
    </div>
  );
}
