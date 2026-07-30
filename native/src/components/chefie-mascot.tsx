import { Image } from 'expo-image';

/**
 * Chefie, la mascota de Nutrilp: un gorro de chef con cara. NO es un aguacate
 * con gorro — el gorro ES el personaje.
 *
 * Desde 2026-07-30 son ILUSTRACIONES, no el SVG dibujado a mano de antes: la
 * versión vectorial no se leía como gorro de chef (la copa era casi tan ancha
 * como la cinta y parecía una nube). Estas vienen de las dos hojas que pasó el
 * usuario, recortadas y con el alfa reconstruido — ver `.claude/chefie-originales/`.
 *
 * La API se mantiene (`pose` + `size`) para no tocar los sitios que ya la usan.
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

/**
 * Cada sprite tiene su propia proporción (el que lleva bandeja es más ancho que
 * el de brazos caídos), así que se guarda para no deformarlos: se fija el alto
 * y el ancho sale de aquí.
 */
const SPRITES: Record<ChefiePose, { src: number; ratio: number }> = {
  idle: { src: require('../../assets/images/chefie/chefie-idle.png'), ratio: 336 / 420 },
  point: { src: require('../../assets/images/chefie/chefie-point.png'), ratio: 371 / 420 },
  // "explain" no tiene sprite propio: se usa el de brazos abiertos, que es
  // justo el gesto de estar contando algo.
  explain: { src: require('../../assets/images/chefie/chefie-shrug.png'), ratio: 408 / 420 },
  shrug: { src: require('../../assets/images/chefie/chefie-shrug.png'), ratio: 408 / 420 },
  celebrate: { src: require('../../assets/images/chefie/chefie-celebrate.png'), ratio: 380 / 420 },
  thumbsup: { src: require('../../assets/images/chefie/chefie-thumbsup.png'), ratio: 353 / 420 },
  whisk: { src: require('../../assets/images/chefie/chefie-whisk.png'), ratio: 332 / 420 },
  thinking: { src: require('../../assets/images/chefie/chefie-thinking.png'), ratio: 361 / 420 },
  serve: { src: require('../../assets/images/chefie/chefie-serve.png'), ratio: 436 / 420 },
};

export function ChefieMascot({ pose = 'idle', size = 96 }: { pose?: ChefiePose; size?: number }) {
  const sprite = SPRITES[pose] ?? SPRITES.idle;
  // `size` se venía interpretando como ancho y el alto salía 1,25×. Se conserva
  // esa relación para que las pantallas que ya la usaban no encojan.
  const height = Math.round(size * 1.25);

  return (
    <Image
      source={sprite.src}
      style={{ height, width: Math.round(height * sprite.ratio) }}
      contentFit="contain"
      transition={120}
      accessibilityLabel="Chefie, la mascota de Nutrilp"
    />
  );
}
