'use client';
import { Logo } from '@/components/icons/logo';

export function PageHeader() {
  return (
    <>
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-center">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold tracking-tight text-foreground">
                NutriPlanner
              </span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
