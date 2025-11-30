import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Logo } from '@/components/icons/logo';
import { MobileNav } from '@/components/layout/mobile-nav';

export const metadata: Metadata = {
  title: 'NutriPlanner',
  description: 'Planifica tus comidas, crea recetas y sigue tu nutrición.',
  manifest: '/manifest.json',
};

const Loader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
          <Logo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
    </div>
);


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Kalam:wght@400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body 
        className="font-body antialiased bg-background kitchen-bg"
      >
        <FirebaseClientProvider>
            <Suspense fallback={<Loader />}>
                {children}
            </Suspense>
          <Toaster />
          <MobileNav />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
