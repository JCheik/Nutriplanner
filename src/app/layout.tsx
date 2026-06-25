import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter, Playfair_Display, Kalam } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Logo } from '@/components/icons/logo';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { InstallPrompt } from '@/components/pwa/install-prompt';

// Self-hosted via next/font: no render-blocking external request and no layout
// shift (the previous <link> approach triggered next/no-page-custom-font).
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], variable: '--font-headline', display: 'swap' });
const kalam = Kalam({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-handwriting', display: 'swap' });

export const metadata: Metadata = {
  title: 'Nutrilp',
  description: 'Planifica tus comidas, crea recetas y sigue tu nutrición.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nutrilp',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#22c55e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
    <html lang="es" className={`light ${inter.variable} ${playfair.variable} ${kalam.variable}`}>
      <body
        className="font-body antialiased bg-background kitchen-bg"
      >
        <FirebaseClientProvider>
            <Suspense fallback={<Loader />}>
                {children}
            </Suspense>
          <Toaster />
          <MobileNav />
          <ServiceWorkerRegister />
          <InstallPrompt />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
