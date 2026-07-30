import { redirect } from 'next/navigation';

/**
 * Las rutas de la antigua web móvil (`/mobile/recipes`, `/mobile/perfil`,
 * `/mobile/shopping-list`, `/mobile/diario`, `/mobile/objetivos`) se retiraron
 * el 2026-07-30. Este comodín evita un 404 a quien llegue con un marcador
 * viejo o con la PWA instalada apuntando a una de ellas: se le lleva al
 * aterrizaje, que le ofrece la app.
 */
export default function LegacyMobileRoutes() {
  redirect('/mobile');
}
