/**
 * Recorta las hojas 2x2 de Chefie y les devuelve la transparencia.
 *
 * Dos problemas que resuelve:
 *
 * 1. El damero de "fondo transparente" viene PINTADO como píxeles opacos. No
 *    vale con quitar los claros: el cuerpo de Chefie es crema, casi tan claro
 *    como el damero. Se rellena desde el BORDE hacia dentro y se para en el
 *    contorno oscuro, que es lo que encierra al personaje.
 *
 * 2. Los dibujos vecinos invaden la celda (el brazo con la tarta se mete en la
 *    de la sartén). Se etiquetan las manchas conexas y se tira lo que entra por
 *    un borde sin ser la figura principal. Las chispitas, que van sueltas pero
 *    dentro, sobreviven.
 */
const sharp = require('sharp');
const path = require('path');

const OUT_H = 420; // misma altura que los sprites que ya existen
const DARK = 150; // luminancia por debajo de la cual es contorno (barrera)

async function cell(file, col, row, name, outDir) {
  const { width, height } = await sharp(file).metadata();
  const cw = Math.floor(width / 2);
  const ch = Math.floor(height / 2);

  const { data, info } = await sharp(file)
    .extract({ left: col * cw, top: row * ch, width: cw, height: ch })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

  // ── 1. Fuera = lo alcanzable desde el borde sin cruzar contorno ──────────
  const outside = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (outside[p] || lum(p * 4) < DARK) return;
    outside[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // ── 2. Manchas conexas de lo que queda ──────────────────────────────────
  const label = new Int32Array(w * h).fill(-1);
  const blobs = [];
  for (let p0 = 0; p0 < w * h; p0++) {
    if (outside[p0] || label[p0] !== -1) continue;
    const id = blobs.length;
    const blob = { size: 0, touchesEdge: false };
    label[p0] = id;
    const q = [p0];
    while (q.length) {
      const p = q.pop();
      blob.size++;
      const x = p % w;
      const y = (p / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) blob.touchesEdge = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (outside[np] || label[np] !== -1) continue;
        label[np] = id;
        q.push(np);
      }
    }
    blobs.push(blob);
  }

  const main = blobs.reduce((best, b, i) => (b.size > blobs[best].size ? i : best), 0);
  let dropped = 0;
  for (let p = 0; p < w * h; p++) {
    const id = label[p];
    // Transparente lo de fuera, y también las manchas que entran por un borde
    // sin ser la figura: son el dibujo de la celda de al lado.
    if (outside[p] || (id !== main && blobs[id].touchesEdge)) {
      if (!outside[p]) dropped++;
      data[p * 4 + 3] = 0;
    }
  }

  const out = path.join(outDir, `${name}.png`);
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim()
    .resize({ height: OUT_H })
    .toFile(out);

  const m = await sharp(out).metadata();
  console.log(
    `${name.padEnd(20)} ${m.width}x${m.height}  manchas:${blobs.length}  invasores borrados:${dropped}px`
  );
}

(async () => {
  const [sheet1, sheet2, outDir] = process.argv.slice(2);
  // Solo las poses que aportan algo nuevo; el resto duplican las que ya hay.
  await cell(sheet1, 0, 0, 'chefie-interview', outDir); // tablet "cuestionario nutricional"
  await cell(sheet1, 1, 1, 'chefie-inventory', outDir); // tabla "inventario"
  await cell(sheet2, 1, 0, 'chefie-rolling', outDir); // rodillo, cara de esfuerzo
  await cell(sheet2, 1, 1, 'chefie-cooking', outDir); // sartén con huevo, contento
})().catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
