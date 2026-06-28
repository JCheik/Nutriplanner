/* =========================================================================
   ATRAPASUEÑOS EN 3D  (Three.js, vendorizado en /vendor/three)
   -------------------------------------------------------------------------
   Modelos fijos que imitan los atrapasueños reales de BabySer: nombre tejido
   a crochet arriba, fila de pompones (o flores / arcoíris) en el arco de
   abajo, flecos largos de trapillo cayendo y alguna pluma.

   El usuario SOLO cambia los colores (nombre y combinación de cintas/lana) y
   el modelo. La pieza se puede girar con el ratón/dedo y acercar con la rueda.

   Script clásico (usa el THREE global de vendor/three/three.min.js) para que
   funcione también abriendo el archivo directamente (file://), sin servidor.
   Si no hay WebGL, el configurador muestra el dibujo 2D (SVG) de respaldo.
   ========================================================================= */

(function () {
"use strict";

if (typeof THREE === "undefined") return;

const WOOD = "#C4926A";
const WOOD_DARK = "#a9784f";
const CREAM = "#F3E7D8";
const WEB = 0xf4efe7;
const BURLAP = "#caa97a";

let renderer, scene, camera, controls, mountEl;
let dcGroup;
let currentState = null;
const disposables = [];
const R = 2.0; // radio del aro

/* ---------- Arranque ---------- */
function init() {
  mountEl = document.getElementById("previewStage");
  if (!mountEl) return false;

  try {
    const t = document.createElement("canvas");
    if (!(t.getContext("webgl") || t.getContext("experimental-webgl"))) return false;
  } catch (e) { return false; }

  const w = mountEl.clientWidth || 360;
  const h = mountEl.clientHeight || 480;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  mountEl.innerHTML = "";
  mountEl.appendChild(renderer.domElement);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.cursor = "grab";

  scene = new THREE.Scene();

  // Composición vertical: aro arriba, flecos cayendo
  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  camera.position.set(1.4, 0.2, 10.6);

  scene.add(new THREE.HemisphereLight(0xfff6ec, 0xe3d2bf, 0.62));
  const key = new THREE.DirectionalLight(0xfff4e8, 1.15);
  key.position.set(3.5, 5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -5; key.shadow.camera.right = 5;
  key.shadow.camera.top = 3.5; key.shadow.camera.bottom = -6.5;
  key.shadow.bias = -0.0006;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9f0ff, 0.32);
  fill.position.set(-4, -1, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-2, 3, -4);
  scene.add(rim);

  // Pared de fondo que recoge la sombra (como una foto de producto)
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.16 })
  );
  wall.position.z = -1.7;
  wall.receiveShadow = true;
  scene.add(wall);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 16;
  controls.target.set(0, -1.4, 0);
  controls.minPolarAngle = Math.PI * 0.3;
  controls.maxPolarAngle = Math.PI * 0.66;
  controls.autoRotate = false;
  controls.update();

  dcGroup = new THREE.Group();
  scene.add(dcGroup);

  if (window.ResizeObserver) new ResizeObserver(onResize).observe(mountEl);
  else window.addEventListener("resize", onResize);

  animate();
  return true;
}

function onResize() {
  if (!renderer || !mountEl) return;
  const w = mountEl.clientWidth, h = mountEl.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer) renderer.render(scene, camera);
}

/* ---------- Utilidades ---------- */
function track(o) { disposables.push(o); return o; }

function clearGroup() {
  if (!dcGroup) return;
  for (let i = dcGroup.children.length - 1; i >= 0; i--) dcGroup.remove(dcGroup.children[i]);
  disposables.forEach(d => { if (d && d.dispose) d.dispose(); });
  disposables.length = 0;
}

function mat(color, opts = {}) {
  return track(new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.0,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    map: opts.map ?? null,
    bumpMap: opts.bumpMap ?? null,
    bumpScale: opts.bumpScale ?? 1,
    flatShading: opts.flatShading ?? false,
  }));
}

// Pastel claro -> tono de "lana teñida" (más vivo y un poco más oscuro)
function yarnColor(input) {
  const c = new THREE.Color(input);
  const hsl = {}; c.getHSL(hsl);
  hsl.s = Math.min(1, hsl.s * 1.5 + 0.1);
  hsl.l = Math.max(0, hsl.l - 0.1);
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return c;
}

let _woodTex = null;
function woodTexture() {
  if (_woodTex) return _woodTex;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const x = c.getContext("2d");
  x.fillStyle = "#c4926a"; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * c.height;
    x.strokeStyle = `rgba(${120 + Math.random() * 50},${88 + Math.random() * 30},${58 + Math.random() * 20},${0.05 + Math.random() * 0.12})`;
    x.lineWidth = 0.5 + Math.random() * 1.6;
    x.beginPath(); x.moveTo(0, y);
    x.bezierCurveTo(c.width * 0.33, y + (Math.random() * 8 - 4), c.width * 0.66, y + (Math.random() * 8 - 4), c.width, y + (Math.random() * 6 - 3));
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 1);
  t.encoding = THREE.sRGBEncoding;
  _woodTex = t;
  return t;
}

// Textura del nombre con aspecto de lana/crochet (con relieve)
function makeNameTexture(name, color) {
  const c = document.createElement("canvas");
  c.width = 900; c.height = 320;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  let size = 200;
  if (name.length > 4) size = 170;
  if (name.length > 6) size = 135;
  if (name.length > 8) size = 110;
  if (name.length > 10) size = 92;
  ctx.font = `italic 700 ${size}px 'Playfair Display', Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = c.width / 2, cy = c.height / 2;
  ctx.save();
  ctx.shadowColor = "rgba(60,40,25,0.35)";
  ctx.shadowBlur = 8; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6;
  ctx.fillStyle = color;
  ctx.fillText(name, cx, cy);
  ctx.restore();
  ctx.lineWidth = Math.max(2, size * 0.035);
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.strokeText(name, cx, cy);
  const tex = track(new THREE.CanvasTexture(c));
  tex.anisotropy = 8;
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

/* ---------- Piezas ---------- */
// Pompón afelpado
function makePompon(x, y, z, color, radius) {
  const r = radius || 0.26;
  const g = new THREE.Group();
  const m = mat(yarnColor(color), { roughness: 1, flatShading: true });
  const core = new THREE.Mesh(track(new THREE.IcosahedronGeometry(r, 1)), m);
  core.castShadow = true; g.add(core);
  const tuft = track(new THREE.SphereGeometry(r * 0.36, 6, 5));
  const n = Math.round(36 * (r / 0.26));
  for (let i = 0; i < n; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1);
    const rr = r * (1 + Math.random() * 0.32);
    const s = new THREE.Mesh(tuft, m);
    s.position.set(Math.sin(v) * Math.cos(u) * rr, Math.sin(v) * Math.sin(u) * rr, Math.cos(v) * rr);
    s.scale.setScalar(0.7 + Math.random() * 0.7);
    s.castShadow = true; g.add(s);
  }
  g.position.set(x, y, z);
  return g;
}

// Fleco/cinta de trapillo: plano fino y largo con ondulación natural
function makeRibbon(x, yTop, len, material, seed, width) {
  const segs = 22;
  const geo = track(new THREE.PlaneGeometry(width || 0.12, len, 1, segs));
  const pos = geo.attributes.position;
  const amp = 0.14 + (seed % 3) * 0.05;
  for (let i = 0; i < pos.count; i++) {
    const vy = pos.getY(i);
    const f = (len / 2 - vy) / len;
    pos.setZ(i, Math.sin(f * 6 + seed) * amp * f);
    pos.setX(i, pos.getX(i) + Math.sin(f * 3.5 + seed * 1.3) * 0.12 * f);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.position.set(x, yTop - len / 2, Math.sin(seed) * 0.05);
  m.rotation.y = Math.sin(seed * 2) * 0.18;
  return m;
}

function makeFeather(x, y, color, rot) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 16, 16)), mat(color, { roughness: 0.85, side: THREE.DoubleSide }));
  blade.scale.set(0.45, 1.7, 0.1);
  blade.castShadow = true; g.add(blade);
  const quill = new THREE.Mesh(track(new THREE.CylinderGeometry(0.018, 0.018, 1.0, 8)), mat(WOOD_DARK));
  quill.position.y = -0.25; g.add(quill);
  g.position.set(x, y, 0.25);
  g.rotation.z = rot || 0;
  return g;
}

function makeFlower(x, y, color, scale) {
  const s = scale || 1;
  const g = new THREE.Group();
  const petalGeo = track(new THREE.SphereGeometry(0.16 * s, 14, 14));
  const petMat = mat(yarnColor(color), { roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 / 6) * i;
    const p = new THREE.Mesh(petalGeo, petMat);
    p.position.set(Math.cos(a) * 0.18 * s, Math.sin(a) * 0.18 * s, 0);
    p.scale.set(1, 1, 0.55); p.castShadow = true; g.add(p);
  }
  const center = new THREE.Mesh(track(new THREE.SphereGeometry(0.12 * s, 14, 14)), mat("#E2B85C", { roughness: 0.5 }));
  center.castShadow = true; g.add(center);
  g.position.set(x, y, 0.22);
  return g;
}

// Rosita de yute/burlap (como en los modelos reales)
function makeBurlapRose(x, y) {
  const g = new THREE.Group();
  const m = mat(BURLAP, { roughness: 1, flatShading: true });
  const base = new THREE.Mesh(track(new THREE.SphereGeometry(0.2, 12, 10)), m);
  base.scale.set(1, 1, 0.6); base.castShadow = true; g.add(base);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.08 + i * 0.05, 0.03, 8, 18)), m);
    ring.rotation.z = i * 0.7; ring.position.z = 0.05; ring.castShadow = true; g.add(ring);
  }
  g.position.set(x, y, 0.24);
  return g;
}

// Arcoíris de fieltro (arcos concéntricos)
function makeRainbow(x, y, colors) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const rr = 0.32 + i * 0.16;
    const band = new THREE.Mesh(
      track(new THREE.TorusGeometry(rr, 0.075, 12, 40, Math.PI)),
      mat(yarnColor(colors[i % colors.length]), { roughness: 0.95, flatShading: true })
    );
    band.castShadow = true; g.add(band);
  }
  g.position.set(x, y, 0.22);
  return g;
}

/* ---------- Construcción ---------- */
function build(state) {
  clearGroup();

  const name = state.name || "Nombre";
  const placeholder = !state.name;
  const palette = (state.ribbons && state.ribbons.length) ? state.ribbons : ["#EAC8C8"];
  const model = state.model || "pompones";

  // --- Aro de madera ---
  const hoop = new THREE.Mesh(
    track(new THREE.TorusGeometry(R, 0.12, 24, 120)),
    mat(WOOD, { roughness: 0.78, map: woodTexture(), bumpMap: woodTexture(), bumpScale: 0.012 })
  );
  hoop.castShadow = true; hoop.receiveShadow = true; dcGroup.add(hoop);

  const loop = new THREE.Mesh(track(new THREE.TorusGeometry(0.26, 0.045, 16, 48)), mat(WOOD_DARK, { roughness: 0.8 }));
  loop.position.set(0, R + 0.26, 0); loop.castShadow = true; dcGroup.add(loop);

  // --- Telaraña blanca ---
  const webPts = [];
  const N = 10;
  const ring1 = [], ring2 = [];
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 / N) * i;
    ring1.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0));
    ring2.push(new THREE.Vector3(Math.cos(a + 0.32) * R * 0.5, Math.sin(a + 0.32) * R * 0.5, 0));
  }
  for (let i = 0; i < N; i++) {
    webPts.push(ring1[i], ring2[i]);
    webPts.push(ring2[i], ring2[(i + 1) % N]);
    webPts.push(ring2[i], new THREE.Vector3(0, 0, 0));
  }
  const web = new THREE.LineSegments(
    track(new THREE.BufferGeometry().setFromPoints(webPts)),
    track(new THREE.LineBasicMaterial({ color: WEB, transparent: true, opacity: 0.9 }))
  );
  dcGroup.add(web);

  // --- Nombre tejido (parte de arriba del aro) ---
  const tex = makeNameTexture(name, state.nameColor || WOOD);
  const nameMat = track(new THREE.MeshStandardMaterial({
    map: tex, bumpMap: tex, bumpScale: 0.06,
    transparent: true, alphaTest: 0.35, side: THREE.DoubleSide,
    roughness: 0.85, opacity: placeholder ? 0.5 : 1,
  }));
  const namePlane = new THREE.Mesh(track(new THREE.PlaneGeometry(3.4, 1.2)), nameMat);
  namePlane.position.set(0, 0.55, 0.08);
  dcGroup.add(namePlane);

  // --- Flecos largos de trapillo (desde el arco inferior) ---
  const ribMats = palette.map(col => mat(yarnColor(col), { side: THREE.DoubleSide, roughness: 0.95 }));
  const creamMat = mat(CREAM, { side: THREE.DoubleSide, roughness: 0.9 });
  const strands = 24;
  const spread = R * 1.92;
  for (let i = 0; i < strands; i++) {
    const t = i / (strands - 1);
    const x = -spread / 2 + spread * t;
    const yTop = -Math.sqrt(Math.max(0, R * R - Math.min(x * x, R * R))) + 0.04;
    const len = 3.0 + ((i % 4) * 0.5) + Math.sin(i * 1.7) * 0.45;
    let m, width;
    if (i % 7 === 3) { m = creamMat; width = 0.06; }        // cordón/encaje fino crema
    else { m = ribMats[i % ribMats.length]; width = 0.12; } // trapillo
    dcGroup.add(makeRibbon(x, yTop, len, m, i, width));
  }

  // --- Adorno del arco inferior según el modelo ---
  buildModelDecor(model, palette);

  // --- Plumas (en casi todos los modelos) ---
  if (model !== "flores") {
    dcGroup.add(makeFeather(-R + 0.35, -R - 0.15, "#efe3d6", 0.18));
    dcGroup.add(makeFeather(-R + 0.62, -R - 0.35, "#e7d8c8", -0.05));
  }

  // --- Tamaño ---
  const scale = state.size === "S" ? 0.9 : state.size === "L" ? 1.1 : 1.0;
  dcGroup.scale.setScalar(scale);
}

// Coloca los pompones / flores / arcoíris a lo largo del arco inferior
function buildModelDecor(model, palette) {
  // fila a lo ancho, justo en la base del aro (donde arrancan los flecos)
  const rowY = -R * 0.74;
  const xs = [-1.25, -0.62, 0, 0.62, 1.25];

  if (model === "flores") {
    xs.forEach((x, i) => {
      const big = (i === 2);
      dcGroup.add(makeFlower(x, rowY + (big ? 0.05 : 0), palette[i % palette.length], big ? 1.5 : 1.1));
    });
    dcGroup.add(makeBurlapRose(-1.65, rowY - 0.05));
    dcGroup.add(makeBurlapRose(1.65, rowY - 0.05));
    return;
  }

  if (model === "arcoiris") {
    dcGroup.add(makeRainbow(0, rowY - 0.15, palette));
    dcGroup.add(makePompon(-0.95, rowY, 0.18, palette[0], 0.26));
    dcGroup.add(makePompon(0.95, rowY, 0.18, palette[1] || palette[0], 0.26));
    dcGroup.add(makeFlower(-1.5, rowY - 0.05, palette[2] || palette[0], 0.9));
    dcGroup.add(makeFlower(1.5, rowY - 0.05, palette[3] || palette[0], 0.9));
    return;
  }

  // pompones (por defecto): fila de pompones afelpados + 2 rositas de yute
  const sizes = [0.24, 0.3, 0.34, 0.3, 0.24];
  xs.forEach((x, i) => dcGroup.add(makePompon(x, rowY, 0.18, palette[i % palette.length], sizes[i])));
  dcGroup.add(makeBurlapRose(-1.7, rowY));
  dcGroup.add(makeBurlapRose(1.7, rowY));
}

/* ---------- API ---------- */
function update(state) {
  currentState = state;
  if (dcGroup) build(state);
}

const ok = init();
if (ok) {
  window.Dreamcatcher3D = { ready: true, update };
  if (typeof window.onDreamcatcher3DReady === "function") window.onDreamcatcher3DReady();
  else if (currentState) build(currentState);
} else {
  const hint = document.getElementById("previewHint");
  if (hint) hint.style.display = "none";
  window.Dreamcatcher3D = { ready: false, update() {} };
}

})();
