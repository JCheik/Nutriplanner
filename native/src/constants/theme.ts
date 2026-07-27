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
    macroProtein: '#93A77F',
    macroCarbs: '#D3AC55',
    macroFat: '#E06A44',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

/**
 * Big titles and hero numbers are warm serif (the brand voice); UI text is the
 * platform sans. Android has no Georgia — its bundled "serif" (Noto Serif) is
 * the intended fallback.
 */
export const Fonts = {
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
  sans: Platform.select({ ios: 'System', default: 'sans-serif' }),
} as const;

export const Radii = {
  card: 12,
  panel: 16,
  pill: 999,
} as const;
