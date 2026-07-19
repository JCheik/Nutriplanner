'use client';

import { cn } from '@/lib/utils';

/**
 * Avo, la mascota de Nutrilp. SVG por poses con animaciones CSS (keyframes en
 * globals.css, prefijo avo-). `flip` refleja horizontalmente la pose completa:
 * el brazo de "point" señala a la derecha de Avo, así que con flip señala a la
 * izquierda — el tour lo usa según en qué lado del control se coloque.
 */
export type AvoPose = 'idle' | 'point' | 'explain' | 'celebrate';

export function AvoMascot({ pose = 'idle', flip = false, size = 96, className }: {
  pose?: AvoPose;
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
      <g className={isCelebrate ? 'avo-hop' : 'avo-bob'}>
        {/* Hoja */}
        <g className="avo-leaf">
          <ellipse cx="66" cy="20" rx="5" ry="11" fill="#5f7f4c" transform="rotate(28 66 20)" />
        </g>
        {/* Cuerpo: piel, carne y hueso */}
        <path d="M60,26 C77,26 89,45 89,76 C89,104 77,122 60,122 C43,122 31,104 31,76 C31,45 43,26 60,26 Z" fill="#5f7f4c" />
        <path d="M60,32 C73,32 83,49 83,76 C83,100 73,116 60,116 C47,116 37,100 37,76 C37,49 47,32 60,32 Z" fill="#cfe0ab" />
        <circle cx="60" cy="92" r="15" fill="#8a5a3b" />
        <path d="M52,86 a11,11 0 0,1 8,-5" stroke="#a06e49" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Cara */}
        <g className="avo-eyes">
          <circle cx="52" cy="60" r="3.4" fill="#33231a" />
          <circle cx="68" cy="60" r="3.4" fill="#33231a" />
        </g>
        <circle cx="46" cy="68" r="3" fill="#e9a883" />
        <circle cx="74" cy="68" r="3" fill="#e9a883" />
        {openMouth
          ? <ellipse cx="60" cy="71" rx="4.5" ry="5.5" fill="#33231a" />
          : <path d="M53,69 Q60,74 67,69" stroke="#33231a" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
        {/* Brazos según pose */}
        {pose === 'idle' && (
          <>
            <path d="M34,82 Q26,88 25,96" stroke="#5f7f4c" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M86,82 Q94,88 95,96" stroke="#5f7f4c" strokeWidth="7" fill="none" strokeLinecap="round" />
          </>
        )}
        {pose === 'point' && (
          <>
            <path d="M34,82 Q26,88 25,96" stroke="#5f7f4c" strokeWidth="7" fill="none" strokeLinecap="round" />
            <g className="avo-arm-point">
              <path d="M86,80 Q100,72 108,68" stroke="#5f7f4c" strokeWidth="7" fill="none" strokeLinecap="round" />
              <circle cx="110" cy="67" r="4.5" fill="#5f7f4c" />
            </g>
          </>
        )}
        {pose === 'explain' && (
          <>
            <g className="avo-arm-wave-l">
              <path d="M34,80 Q24,72 21,62" stroke="#5f7f4c" strokeWidth="7" fill="none" strokeLinecap="round" />
              <circle cx="20" cy="60" r="4.5" fill="#5f7f4c" />
            </g>
            <g className="avo-arm-wave-r">
              <path d="M86,80 Q96,72 99,62" stroke="#5f7f4c" strokeWidth="7" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="60" r="4.5" fill="#5f7f4c" />
            </g>
          </>
        )}
        {isCelebrate && (
          <>
            <path d="M34,78 Q26,64 26,52" stroke="#5f7f4c" strokeWidth="7" fill="none" strokeLinecap="round" />
            <circle cx="26" cy="50" r="4.5" fill="#5f7f4c" />
            <path d="M86,78 Q94,64 94,52" stroke="#5f7f4c" strokeWidth="7" fill="none" strokeLinecap="round" />
            <circle cx="94" cy="50" r="4.5" fill="#5f7f4c" />
          </>
        )}
      </g>
    </svg>
  );
}
