import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * Chefie, la mascota de Nutrilp: un gorro de chef con cara, en plan cute — port
 * del SVG de la web (`components/nutri-planner/chefie-mascot.tsx`). NO es un
 * aguacate con gorro: el gorro ES el personaje.
 *
 * Todo blanco a propósito. Como el fondo también es claro, la legibilidad la da
 * el CONTORNO: cada pieza se dibuja dos veces — una capa algo más grande en
 * `LINE` y encima la de relleno. Ese truco además evita que se vean los arcos
 * internos donde las piezas de la silueta se solapan.
 *
 * Sin animaciones (en nativo irían con Reanimated; no hacen falta aquí).
 */
export type ChefiePose = 'idle' | 'point' | 'explain' | 'celebrate';

const CREAM = '#FFFDF9';
const LINE = '#CDBCA4';
const PLEAT = '#E7DCC9';
const INK = '#33231a';
const BLUSH = '#e9a883';

/** Brazo: trazo de contorno y encima el de relleno. */
function Limb({ d }: { d: string }) {
  return (
    <>
      <Path d={d} stroke={LINE} strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path d={d} stroke={CREAM} strokeWidth={6.5} fill="none" strokeLinecap="round" />
    </>
  );
}

/** Mano: mismo truco de doble capa. */
function Hand({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <Circle cx={cx} cy={cy} r={6} fill={LINE} />
      <Circle cx={cx} cy={cy} r={4.2} fill={CREAM} />
    </>
  );
}

export function ChefieMascot({ pose = 'idle', size = 96 }: { pose?: ChefiePose; size?: number }) {
  const height = Math.round((size * 150) / 120);
  const isCelebrate = pose === 'celebrate';
  const openMouth = pose === 'explain' || isCelebrate;

  return (
    <Svg width={size} height={height} viewBox="0 0 120 150">
      <G>
        {/* Brazos primero: la cinta los tapa por arriba */}
        {pose === 'idle' ? (
          <>
            <Limb d="M28,104 Q16,109 14,117" />
            <Limb d="M92,104 Q104,109 106,117" />
          </>
        ) : null}
        {pose === 'point' ? (
          <>
            <Limb d="M28,104 Q16,109 14,117" />
            <Limb d="M92,102 Q106,97 112,93" />
            <Hand cx={113} cy={92} />
          </>
        ) : null}
        {pose === 'explain' ? (
          <>
            <Limb d="M28,102 Q15,95 11,87" />
            <Hand cx={10} cy={86} />
            <Limb d="M92,102 Q105,95 109,87" />
            <Hand cx={110} cy={86} />
          </>
        ) : null}
        {isCelebrate ? (
          <>
            <Limb d="M28,100 Q18,87 18,75" />
            <Hand cx={18} cy={73} />
            <Limb d="M92,100 Q102,87 102,75" />
            <Hand cx={102} cy={73} />
          </>
        ) : null}

        {/* Copa ondulada: contorno y relleno */}
        <G fill={LINE}>
          <Circle cx="38" cy="40" r="14.5" />
          <Circle cx="49" cy="40" r="14.5" />
          <Circle cx="60" cy="40" r="14.5" />
          <Circle cx="71" cy="40" r="14.5" />
          <Circle cx="82" cy="40" r="14.5" />
          <Rect x="27.5" y="37.5" width="65" height="59" />
        </G>
        <G fill={CREAM}>
          <Circle cx="38" cy="40" r="12" />
          <Circle cx="49" cy="40" r="12" />
          <Circle cx="60" cy="40" r="12" />
          <Circle cx="71" cy="40" r="12" />
          <Circle cx="82" cy="40" r="12" />
          <Rect x="30" y="40" width="60" height="54" />
        </G>

        {/* Pliegues de la tela */}
        <Path d="M45,50 L45,88" stroke={PLEAT} strokeWidth={2} strokeLinecap="round" />
        <Path d="M75,50 L75,88" stroke={PLEAT} strokeWidth={2} strokeLinecap="round" />

        {/* Cara */}
        <Circle cx="50" cy="64" r="3.6" fill={INK} />
        <Circle cx="70" cy="64" r="3.6" fill={INK} />
        <Circle cx="38" cy="73" r="3.2" fill={BLUSH} />
        <Circle cx="82" cy="73" r="3.2" fill={BLUSH} />
        {openMouth ? (
          <Ellipse cx="60" cy="75" rx="4.2" ry="5" fill={INK} />
        ) : (
          <Path d="M54,72 Q60,78 66,72" stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        )}

        {/* Cinta: tapa la base de la copa y el nacimiento de los brazos */}
        <Rect x="25.5" y="89.5" width="69" height="32" rx="10" fill={LINE} />
        <Rect x="28" y="92" width="64" height="27" rx="8" fill={CREAM} />
      </G>
    </Svg>
  );
}
