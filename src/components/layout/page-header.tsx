'use client';
import { useState } from 'react';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import Link from 'next/link';
import { CalculatorDialog } from '../nutri-planner/calculator-dialog';

export function PageHeader() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  return (
    <>
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold tracking-tight text-foreground">
                NutriPlanner
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setIsCalculatorOpen(true)}>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculadora de Calorías
              </Button>
            </div>
          </div>
        </div>
      </header>
      <CalculatorDialog isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
    </>
  );
}
