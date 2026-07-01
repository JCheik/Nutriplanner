import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter, Playfair_Display, Kalam } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { MobileLoader } from '@/components/layout/mobile-loader';
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
  // Warm off-white matching the app background (--background: 40 33% 96%), not the
  // old green which clashed with the terracotta/cream palette.
  themeColor: '#F7F3EC',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

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
            {/* Fully opaque (not just min-h-[60vh]) so the fixed kitchen-bg photo behind
                body never peeks through during this very first paint. */}
            <Suspense fallback={<div className="min-h-screen"><MobileLoader /></div>}>
                {children}
            </Suspense>
          <Toaster />
          {/* MobileNav is rendered by the mobile layout (src/app/mobile/layout.tsx).
              Rendering it here too produced two stacked navs on mobile routes. */}
          <ServiceWorkerRegister />
          <InstallPrompt />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
