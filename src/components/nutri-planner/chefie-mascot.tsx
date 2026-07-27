'use client';

import { cn } from '@/lib/utils';

/**
 * Chefie, la mascota de Nutrilp: un gorro de chef con cara, en plan cute.
 * NO es un aguacate con gorro — el gorro ES el personaje. Eso nos da identidad
 * propia (hay varias apps de nutrición con mascota-aguacate) y ancla la marca
 * en "cocinar", no en "comer sano" a secas.
 *
 * Todo blanco a propósito (un gorro de chef es blanco). Como el fondo de la app
 * también es claro, la legibilidad la da el CONTORNO, no el color: cada pieza se
 * dibuja dos veces — una capa algo más grande en `LINE` y encima la de relleno.
 * Ese truco además evita que se vean los arcos internos donde las piezas de la
 * silueta se solapan.
 *
 * `flip` refleja la pose completa: el brazo de "point" señala a la derecha de
 * Chefie, así que con flip señala a la izquierda — el tour lo usa según en qué
 * lado del control se coloque.
 */
export type ChefiePose = 'idle' | 'point' | 'explain' | 'celebrate';

const CREAM = '#FFFDF9';
const LINE = '#CDBCA4';
const PLEAT = '#E7DCC9';
const INK = '#33231a';
const BLUSH = '#e9a883';

/** Brazo/pierna: trazo de contorno y encima el de relleno. */
function Limb({ d }: { d: string }) {
  return (
    <>
      <path d={d} stroke={LINE} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d={d} stroke={CREAM} strokeWidth="6.5" fill="none" strokeLinecap="round" />
    </>
  );
}

/** Mano: mismo truco de doble capa. */
function Hand({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="6" fill={LINE} />
      <circle cx={cx} cy={cy} r="4.2" fill={CREAM} />
    </>
  );
}

export function ChefieMascot({ pose = 'idle', flip = false, size = 96, className }: {
  pose?: ChefiePose;
  flip?: boolean;
  size?: number;
  className?: string;
}) {
  const height = Math.round((size * 150) / 120);
  const isCelebrate = pose === 'celebrate';
  const openMouth = pose === 'explain' || isCelebrate;

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 120 150"
      className={cn('overflow-visible shrink-0', flip && '-scale-x-100', className)}
      aria-hidden="true"
    >
      <g className={isCelebrate ? 'chef-hop' : 'chef-bob'}>
        <g className="chef-wobble">
          {/* Brazos primero: la cinta los tapa por arriba y parece que salen de dentro */}
          {pose === 'idle' && (
            <>
              <Limb d="M28,104 Q16,109 14,117" />
              <Limb d="M92,104 Q104,109 106,117" />
            </>
          )}
          {pose === 'point' && (
            <>
              <Limb d="M28,104 Q16,109 14,117" />
              <g className="chef-arm-point">
                <Limb d="M92,102 Q106,97 112,93" />
                <Hand cx={113} cy={92} />
              </g>
            </>
          )}
          {pose === 'explain' && (
            <>
              <g className="chef-arm-wave-l">
                <Limb d="M28,102 Q15,95 11,87" />
                <Hand cx={10} cy={86} />
              </g>
              <g className="chef-arm-wave-r">
                <Limb d="M92,102 Q105,95 109,87" />
                <Hand cx={110} cy={86} />
              </g>
            </>
          )}
          {isCelebrate && (
            <>
              <Limb d="M28,100 Q18,87 18,75" />
              <Hand cx={18} cy={73} />
              <Limb d="M92,100 Q102,87 102,75" />
              <Hand cx={102} cy={73} />
            </>
          )}

          {/* Copa ondulada: contorno y relleno */}
          <g fill={LINE}>
            <circle cx="38" cy="40" r="14.5" />
            <circle cx="49" cy="40" r="14.5" />
            <circle cx="60" cy="40" r="14.5" />
            <circle cx="71" cy="40" r="14.5" />
            <circle cx="82" cy="40" r="14.5" />
            <rect x="27.5" y="37.5" width="65" height="59" />
          </g>
          <g fill={CREAM}>
            <circle cx="38" cy="40" r="12" />
            <circle cx="49" cy="40" r="12" />
            <circle cx="60" cy="40" r="12" />
            <circle cx="71" cy="40" r="12" />
            <circle cx="82" cy="40" r="12" />
            <rect x="30" y="40" width="60" height="54" />
          </g>

          {/* Pliegues de la tela */}
          <path d="M45,50 L45,88" stroke={PLEAT} strokeWidth="2" strokeLinecap="round" />
          <path d="M75,50 L75,88" stroke={PLEAT} strokeWidth="2" strokeLinecap="round" />

          {/* Cara */}
          <g className="chef-eyes">
            <circle cx="50" cy="64" r="3.6" fill={INK} />
            <circle cx="70" cy="64" r="3.6" fill={INK} />
          </g>
          <circle cx="38" cy="73" r="3.2" fill={BLUSH} />
          <circle cx="82" cy="73" r="3.2" fill={BLUSH} />
          {openMouth
            ? <ellipse cx="60" cy="75" rx="4.2" ry="5" fill={INK} />
            : <path d="M54,72 Q60,78 66,72" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />}

          {/* Cinta: tapa la base de la copa y el nacimiento de los brazos */}
          <rect x="25.5" y="89.5" width="69" height="32" rx="10" fill={LINE} />
          <rect x="28" y="92" width="64" height="27" rx="8" fill={CREAM} />
        </g>
      </g>
    </svg>
  );
}
