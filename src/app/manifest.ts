import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Nutrilp',
    short_name: 'Nutrilp',
    description: 'Planifica tus comidas, crea recetas y sigue tu nutrición.',
    // Launch at the root so the auth/viewport router picks the mobile or desktop
    // layout. Hard-coding /dashboard opened the desktop UI on phones.
    start_url: '/',
    scope: '/',
    lang: 'es',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F9F8F6',
    theme_color: '#F7F3EC',
    categories: ['food', 'health', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
