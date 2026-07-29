import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Marco de las páginas legales (`/privacidad`, `/terminos`). Públicas y sin
 * auth a propósito: Google Play y App Store exigen una URL accesible sin
 * cuenta, y la app enlaza aquí desde Perfil.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          ← Volver a Nutrilp
        </Link>
        <article
          className="mt-8 space-y-5 text-[15px] leading-relaxed text-foreground/90
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
            [&_h1]:font-headline [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-foreground
            [&_h2]:mt-9 [&_h2]:font-headline [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground
            [&_li]:mb-1.5
            [&_strong]:font-semibold [&_strong]:text-foreground
            [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
        >
          {children}
        </article>
      </div>
    </div>
  );
}
