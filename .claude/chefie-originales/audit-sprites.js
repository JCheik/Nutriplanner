/** Audita los sprites ya integrados: manchas sueltas y recortes. */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ALPHA = 16; // por encima de esto se considera píxel del dibujo

async function audit(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const on = (p) => data[p * 4 + 3] > ALPHA;

  const label = new Int32Array(w * h).fill(-1);
  const blobs = [];
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!on(p0) || label[p0] !== -1) continue;
    const id = blobs.length;
    const b = { size: 0, x0: w, y0: h, x1: 0, y1: 0 };
    label[p0] = id;
    const q = [p0];
    while (q.length) {
      const p = q.pop();
      b.size++;
      const x = p % w;
      const y = (p / w) | 0;
      if (x < b.x0) b.x0 = x;
      if (y < b.y0) b.y0 = y;
      if (x > b.x1) b.x1 = x;
      if (y > b.y1) b.y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (!on(np) || label[np] !== -1) continue;
        label[np] = id;
        q.push(np);
      }
    }
    blobs.push(b);
  }

  const main = blobs.reduce((best, b, i) => (b.size > blobs[best].size ? i : best), 0);
  const m = blobs[main];

  // ¿La figura principal llega al borde? Tras un trim eso es normal en el lado
  // por donde se recortó; si toca DOS lados opuestos o toca por arriba, huele
  // a que el recorte de la celda se comió una parte.
  const touches = [];
  if (m.x0 === 0) touches.push('izq');
  if (m.y0 === 0) touches.push('arriba');
  if (m.x1 === w - 1) touches.push('der');
  if (m.y1 === h - 1) touches.push('abajo');

  // Manchas sueltas: cualquier otra con tamaño apreciable.
  const strays = blobs
    .map((b, i) => ({ b, i }))
    .filter(({ b, i }) => i !== main && b.size > 200)
    .map(({ b }) => `${b.size}px en (${b.x0},${b.y0})-(${b.x1},${b.y1})`);

  console.log(
    `${path.basename(file).padEnd(24)} ${String(w).padStart(3)}x${h}  manchas:${String(blobs.length).padStart(2)}  ` +
      `principal:${Math.round((m.size / (w * h)) * 100)}%  toca:[${touches.join(',') || '—'}]` +
      (strays.length ? `  ⚠ SUELTAS: ${strays.join(' | ')}` : '')
  );
}

(async () => {
  const dir = process.argv[2];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
    await audit(path.join(dir, f));
  }
})();
