/**
 * Nutrilp design tokens for the native app, taken from the approved wireframes
 * (.claude/bocetos-app-nativa.html, v2) which mirror the web's globals.css.
 * Terracotta on warm cream, sage as a quiet secondary — sage never competes
 * with terracotta, and each screen gets at most ONE filled terracotta button.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    ground: '#F7F3EC',        // app background (cream)
    surface: '#FFFDF9',       // cards / panels (broken warm white)
    ink: '#3A2414',           // primary text (dark earth brown)
    inkSoft: '#8A6A4A',       // secondary text (mid brown)
    line: '#E2D8C7',          // borders / dividers (beige)
    terra: '#D9531F',         // primary accent — buttons, active states
    terraSoft: '#F6E1D6',     // soft terracotta fills (highlights, halos)
    sage: '#7E9A6B',          // secondary accent — diet, AI, soft notices
    sageSoft: '#F1F4EC',      // soft sage fills
    chip: '#EDE6D9',          // neutral pills
    // Papel de la lista de la compra: pósit amarillo escrito a lápiz.
    note: '#FBF1C4',          // hoja del pósit
    noteEdge: '#E6D68F',      // rayas del cuaderno / borde de la hoja
    notePencil: '#4B4230',    // grafito sobre el amarillo
    // Macro bars — the only three data colors in the app.
    macroProtein: '#7E9A6B',
    macroCarbs: '#C99A3E',
    macroFat: '#D9531F',
  },
  dark: {
    ground: '#181210',
    surface: '#241D18',
    ink: '#E9E2D7',
    inkSoft: '#AD9C89',
    line: '#33291F',
    terra: '#E06A44',
    terraSoft: '#3A2318',
    sage: '#93A77F',
    sageSoft: '#232A1D',
    chip: '#2A221B',
    note: '#332C16',
    noteEdge: '#4C4227',
    notePencil: '#DFD5B4',
    macroProtein: '#93A77F',
    macroCarbs: '#D3AC55',
    macroFat: '#E06A44',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

/**
 * Tipografía: las MISMAS familias que la web (el serif del sistema se veía
 * soso comparado con ella).
 * - `serif` = Playfair Display Bold → títulos y números grandes (la voz de marca).
 * - `hand` / `handBold` = Kalam → la lista de la compra, escrita a mano.
 * - `sans` sigue siendo la del sistema a propósito: es la que lleva TODO el
 *   texto de UI con `fontWeight` variable, y una fuente cargada en runtime solo
 *   trae los pesos que se empaqueten (habría que fijar familia por peso en cada
 *   pantalla). La sans del sistema resuelve los pesos ella sola.
 *
 * Las tres se cargan en `app/_layout.tsx` con `useFonts`, no con el plugin de
 * expo-font: el plugin las incrusta en el binario (haría falta recompilar) y
 * así viajan como assets del `eas update`.
 */
export const Fonts = {
  serif: 'PlayfairDisplay_700Bold',
  sans: Platform.select({ ios: 'System', default: 'sans-serif' }),
  hand: 'Kalam_400Regular',
  handBold: 'Kalam_700Bold',
} as const;

export const Radii = {
  card: 12,
  panel: 16,
  pill: 999,
} as const;

/**
 * Sombras suaves y cálidas (nunca gris azulado): sin ellas todo queda plano
 * sobre el crema. `boxShadow` es la API de RN 0.86 — `shadow*`/`elevation`
 * están deprecados.
 */
export const Shadows = {
  card: { boxShadow: '0 1px 3px rgba(58, 36, 20, 0.09)' },
  raised: { boxShadow: '0 3px 10px rgba(58, 36, 20, 0.14)' },
} as const;
