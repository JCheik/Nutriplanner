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
  | 'serve'
  // Añadidas el 2026-08-04. Estas tres llevan un objeto que dice de qué va la
  // pantalla (tablet con el cuestionario, tabla de inventario, sartén), así que
  // solo valen donde ese objeto encaja: puestas al azar, confunden.
  | 'interview'
  | 'inventory'
  | 'cooking'
  | 'rolling'
  // Añadidas el 2026-08-08. Estas tres son de CARA, no de objeto, así que valen
  // en cualquier sitio: dudando con los cachivaches, escéptico de brazos
  // cruzados (para avisos) y riéndose.
  | 'utensils'
  | 'skeptical'
  | 'laugh';

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
  // thinking y serve se recortaron de nuevo el 2026-08-04: el corte por la
  // mitad partía el cloche de serve, que se mete en la celda de thinking.
  thinking: { src: require('../../assets/images/chefie/chefie-thinking.png'), ratio: 323 / 420 },
  serve: { src: require('../../assets/images/chefie/chefie-serve.png'), ratio: 457 / 420 },
  interview: { src: require('../../assets/images/chefie/chefie-interview.png'), ratio: 314 / 420 },
  inventory: { src: require('../../assets/images/chefie/chefie-inventory.png'), ratio: 322 / 420 },
  rolling: { src: require('../../assets/images/chefie/chefie-rolling.png'), ratio: 322 / 420 },
  cooking: { src: require('../../assets/images/chefie/chefie-cooking.png'), ratio: 367 / 420 },
  utensils: { src: require('../../assets/images/chefie/chefie-utensils.png'), ratio: 473 / 420 },
  skeptical: { src: require('../../assets/images/chefie/chefie-skeptical.png'), ratio: 371 / 420 },
  laugh: { src: require('../../assets/images/chefie/chefie-laugh.png'), ratio: 371 / 420 },
};

/**
 * `flip` refleja el sprite en horizontal. Sirve sobre todo para `point`: el
 * brazo señala siempre al mismo lado, y puesto a la izquierda de un texto
 * acababa señalando hacia fuera. Voltear sale gratis y vale para todas las
 * poses, así que no hace falta un sprite espejo por cada una.
 */
export function ChefieMascot({
  pose = 'idle',
  size = 96,
  flip = false,
}: {
  pose?: ChefiePose;
  size?: number;
  flip?: boolean;
}) {
  const sprite = SPRITES[pose] ?? SPRITES.idle;
  // `size` se venía interpretando como ancho y el alto salía 1,25×. Se conserva
  // esa relación para que las pantallas que ya la usaban no encojan.
  const height = Math.round(size * 1.25);

  return (
    <Image
      source={sprite.src}
      style={{
        height,
        width: Math.round(height * sprite.ratio),
        ...(flip ? { transform: [{ scaleX: -1 as const }] } : {}),
      }}
      contentFit="contain"
      transition={120}
      accessibilityLabel="Chefie, la mascota de Nutrilp"
    />
  );
}
