'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * Chefie, la mascota de Nutrilp: un gorro de chef con cara. NO es un aguacate
 * con gorro — el gorro ES el personaje. Eso da identidad propia (hay varias
 * apps de nutrición con mascota-aguacate) y ancla la marca en "cocinar".
 *
 * Desde 2026-07-30 son ILUSTRACIONES en PNG, no el SVG dibujado a mano: aquella
 * versión no se leía como gorro de chef (la copa era casi tan ancha como la
 * cinta y parecía una nube). Originales y proceso de recorte en
 * `.claude/chefie-originales/`.
 *
 * Lo que se pierde al dejar el SVG: las animaciones por piezas (parpadeo, brazo
 * que señala). Se conservan las que actúan sobre la figura entera, que son las
 * que más se notan: flotar y bambolearse.
 *
 * `flip` refleja la pose: el brazo de "point" señala a la derecha de Chefie, y
 * el tour lo voltea según de qué lado del control se coloque.
 */
export type ChefiePose =
  | 'idle'
  | 'point'
  | 'explain'
  | 'celebrate'
  | 'thumbsup'
  | 'whisk'
  | 'thinking'
  | 'shrug'
  | 'serve';

/** Proporción real de cada sprite, para no deformarlos: el alto manda. */
const SPRITES: Record<ChefiePose, { file: string; ratio: number }> = {
  idle: { file: 'chefie-idle.png', ratio: 336 / 420 },
  point: { file: 'chefie-point.png', ratio: 371 / 420 },
  // "explain" no tiene sprite propio: se usa el de brazos abiertos, que es
  // justo el gesto de estar contando algo.
  explain: { file: 'chefie-shrug.png', ratio: 408 / 420 },
  shrug: { file: 'chefie-shrug.png', ratio: 408 / 420 },
  celebrate: { file: 'chefie-celebrate.png', ratio: 380 / 420 },
  thumbsup: { file: 'chefie-thumbsup.png', ratio: 353 / 420 },
  whisk: { file: 'chefie-whisk.png', ratio: 332 / 420 },
  thinking: { file: 'chefie-thinking.png', ratio: 361 / 420 },
  serve: { file: 'chefie-serve.png', ratio: 436 / 420 },
};

export function ChefieMascot({
  pose = 'idle',
  flip = false,
  size = 96,
  className,
}: {
  pose?: ChefiePose;
  flip?: boolean;
  size?: number;
  className?: string;
}) {
  const sprite = SPRITES[pose] ?? SPRITES.idle;
  // `size` se venía interpretando como ancho, con el alto a 1,25×. Se mantiene
  // esa relación para no encoger las pantallas que ya lo usaban.
  const height = Math.round(size * 1.25);
  const width = Math.round(height * sprite.ratio);

  // El `className` del llamador va sobre la IMAGEN, no sobre el envoltorio: hay
  // sitios que la dimensionan con clases (`h-28 w-auto`) y, si fuese al padre,
  // la imagen seguiría con su tamaño intrínseco y no encogería.
  return (
    <span
      className={cn('inline-block shrink-0', pose === 'celebrate' ? 'chef-hop' : 'chef-bob')}
      aria-hidden="true"
    >
      <Image
        src={`/chefie/${sprite.file}`}
        alt=""
        width={width}
        height={height}
        className={cn(flip && '-scale-x-100', className)}
      />
    </span>
  );
}
