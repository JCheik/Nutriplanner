/**
 * Recorta las hojas 2x2 de Chefie y les devuelve la transparencia.
 *
 * Uso:  node slice-chefie.js <hoja> <col> <fila> <nombre> <destino>
 *
 * Tres problemas que resuelve, los tres pillados en producción:
 *
 * 1. El damero de "fondo transparente" viene PINTADO como píxeles opacos. No
 *    vale con quitar los claros: el cuerpo de Chefie es crema, casi tan claro
 *    como el damero. Se rellena desde el BORDE hacia dentro y se para en el
 *    contorno oscuro, que es lo que encierra al personaje.
 *
 * 2. Los dibujos NO están centrados en su cuadrante. Cortar por la mitad partió
 *    en dos el cloche de "serve", que se mete bien pasada la mitad: media
 *    bandeja se perdió y la otra media se quedó pegada a "thinking". Por eso el
 *    corte NO se hace al 50%, sino en el hueco vacío que se busca aquí.
 *
 * 3. Aun con el corte bien puesto, un vecino puede invadir la celda. Se
 *    etiquetan las manchas conexas y se descarta lo que entra por un borde sin
 *    ser la figura principal. Las chispitas, sueltas pero interiores, se quedan.
 */
const sharp = require('sharp');
const path = require('path');

const OUT_H = 420; // misma altura para todos los sprites
const DARK = 150; // luminancia por debajo de la cual es contorno (barrera)

/** Marca lo alcanzable desde el borde sin cruzar contorno oscuro = el fondo. */
function floodOutside(data, w, h) {
  const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
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
  return outside;
}

/**
 * Centro del hueco vertical entre los dos dibujos de una fila. Buscar la banda
 * de columnas sin dibujo es más fiable que fiarse del 50%: en la hoja 2 el
 * hueco de abajo está en 418..446 y la mitad cae en 464, dentro del cloche.
 */
async function gutterX(file, row) {
  const { width, height } = await sharp(file).metadata();
  const ch = Math.floor(height / 2);
  const { data, info } = await sharp(file)
    .extract({ left: 0, top: row * ch, width, height: ch })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const outside = floodOutside(data, w, h);

  const mid = Math.floor(w / 2);
  const search = Math.floor(w * 0.2); // se busca a ±20% de la mitad
  let bestStart = -1;
  let bestLen = 0;
  let runStart = -1;
  for (let x = mid - search; x <= mid + search; x++) {
    let empty = true;
    for (let y = 0; y < h; y++) {
      if (!outside[y * w + x]) {
        empty = false;
        break;
      }
    }
    if (empty) {
      if (runStart < 0) runStart = x;
      const len = x - runStart + 1;
      if (len > bestLen) {
        bestLen = len;
        bestStart = runStart;
      }
    } else {
      runStart = -1;
    }
  }
  if (bestLen === 0) return { x: mid, found: false };
  return { x: Math.floor(bestStart + bestLen / 2), found: true, band: [bestStart, bestStart + bestLen - 1] };
}

async function cell(file, col, row, name, outDir) {
  const { width, height } = await sharp(file).metadata();
  const ch = Math.floor(height / 2);
  const g = await gutterX(file, row);
  const left = col === 0 ? 0 : g.x;
  const cw = col === 0 ? g.x : width - g.x;

  const { data, info } = await sharp(file)
    .extract({ left, top: row * ch, width: cw, height: ch })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const outside = floodOutside(data, w, h);

  // Manchas conexas de lo que queda dentro.
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
    `${name.padEnd(20)} ${m.width}x${m.height}  corte x=${g.x}${g.found ? ` (hueco ${g.band[0]}..${g.band[1]})` : ' SIN hueco → mitad'}  invasores:${dropped}px  ratio ${m.width}/420`
  );
}

(async () => {
  const [file, col, row, name, outDir] = process.argv.slice(2);
  await cell(file, Number(col), Number(row), name, outDir);
})().catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
