/**
 * Escape hatch de la redirección a móvil.
 *
 * La app manda a `/mobile` a cualquier pantalla estrecha. Desde que `/mobile`
 * es solo una página de "descárgate la app", quien pulse "Seguir a la versión
 * web" tiene que poder quedarse en el escritorio: sin esto, la redirección lo
 * devolvería al aterrizaje una y otra vez.
 *
 * Se guarda en `sessionStorage` a propósito: dura lo que dure la pestaña. Si el
 * usuario vuelve mañana desde el móvil, se le vuelve a ofrecer la app.
 */
const KEY = 'nutrilp.prefers-desktop';

export function rememberDesktopPreference() {
  try {
    window.sessionStorage.setItem(KEY, '1');
  } catch {
    // Modo privado o storage bloqueado: no es crítico, solo se le volverá a
    // ofrecer la app en la siguiente navegación.
  }
}

/** True si el usuario ya dijo que quiere la versión de escritorio. */
export function prefersDesktop(): boolean {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
