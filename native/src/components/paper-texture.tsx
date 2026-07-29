import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { useResolvedScheme } from '@/hooks/use-theme-preference';

/**
 * Trama de puntos de fondo, la misma idea que el `kitchen-bg` de la web: el
 * crema liso se veía plano, y una retícula muy tenue le da tacto de papel sin
 * competir con nada. Va DETRÁS del contenido (absoluteFill + pointerEvents
 * none), así que no intercepta toques.
 */
export function PaperTexture() {
  const scheme = useResolvedScheme();
  // Muy tenue a propósito: al 0.28 el crema se leía "más oscuro" en vez de
  // texturado. Punto más pequeño y retícula más espaciada.
  const dot = scheme === 'dark' ? 'rgba(224, 106, 68, 0.08)' : 'rgba(217, 160, 136, 0.16)';

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="nutrilp-dots" width={16} height={16} patternUnits="userSpaceOnUse">
          <Circle cx={1} cy={1} r={0.9} fill={dot} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#nutrilp-dots)" />
    </Svg>
  );
}
