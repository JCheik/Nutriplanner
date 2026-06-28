/* =========================================================================
   ATRAPASUEÑOS EN 3D  (Three.js, vendorizado en /vendor/three)
   -------------------------------------------------------------------------
   Dibuja el atrapasueños en 3D dentro del configurador y lo deja girar con
   el ratón / el dedo. Se actualiza en vivo con las opciones (nombre, colores,
   elementos y tamaño) a través de window.Dreamcatcher3D.update(state).

   Es un script clásico (usa el THREE global de vendor/three/three.min.js y
   THREE.OrbitControls) para que funcione también abriendo el archivo
   directamente (file://), sin servidor.

   Si el navegador no soporta WebGL, no pasa nada: el configurador sigue
   mostrando el dibujo 2D (SVG) como respaldo.
   ========================================================================= */

(function () {
"use strict";

if (typeof THREE === "undefined") return; // Three.js no cargó: nos quedamos con el SVG

/* Colores de elementos fijos */
const GOLD = "#E2B85C";
const WOOD = "#C4926A";
const WOOD_DARK = "#a9784f";
const CREAM = "#F3E7D8";

let renderer, scene, camera, controls, mountEl;
let dcGroup;                 // grupo que contiene todo el atrapasueños
let currentState = null;
const disposables = [];      // geometrías/materiales a liberar al reconstruir

/* ---------- Arranque ---------- */
function init() {
  mountEl = document.getElementById("previewStage");
  if (!mountEl) return false;

  // Comprobación de WebGL
  try {
    const test = document.createElement("canvas");
    if (!(test.getContext("webgl") || test.getContext("experimental-webgl"))) {
      return false;
    }
  } catch (e) { return false; }

  const w = mountEl.clientWidth || 360;
  const h = mountEl.clientHeight || 480;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  // Gestión de color + look fotográfico (menos "dibujo animado")
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Sustituimos el contenido (SVG de respaldo) por el lienzo 3D
  mountEl.innerHTML = "";
  mountEl.appendChild(renderer.domElement);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.cursor = "grab";

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  // Ángulo inicial ligeramente en 3/4 para que se note el volumen desde el principio
  camera.position.set(1.6, 0.6, 6.9);

  // Luz ambiente suave y cálida
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0xe3d2bf, 0.6));
  // Luz principal que proyecta sombra (da volumen y realismo)
  const key = new THREE.DirectionalLight(0xfff4e8, 1.15);
  key.position.set(3.5, 5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 25;
  key.shadow.camera.left = -5; key.shadow.camera.right = 5;
  key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0006;
  key.shadow.radius = 4;
  scene.add(key);
  // Relleno frío para suavizar las sombras
  const fill = new THREE.DirectionalLight(0xe9f0ff, 0.35);
  fill.position.set(-4, -1, 3);
  scene.add(fill);
  // Contraluz para recortar la silueta
  const rim = new THREE.DirectionalLight(0xffffff, 0.4);
  rim.position.set(-2, 3, -4);
  scene.add(rim);

  // Pared de fondo que recoge la sombra del atrapasueños (como una foto)
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  );
  wall.position.z = -1.6;
  wall.receiveShadow = true;
  scene.add(wall);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 4.5;
  controls.maxDistance = 12;
  controls.target.set(0, 0.1, 0);
  // Limitamos la inclinación para que siempre se vea bien encuadrado
  controls.minPolarAngle = Math.PI * 0.28;
  controls.maxPolarAngle = Math.PI * 0.70;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;
  // Al tocar/arrastrar, dejamos de auto-rotar para que el usuario controle
  controls.addEventListener("start", () => { controls.autoRotate = false; });
  controls.update();

  dcGroup = new THREE.Group();
  scene.add(dcGroup);

  // Redibujar al cambiar de tamaño el contenedor
  if (window.ResizeObserver) {
    new ResizeObserver(onResize).observe(mountEl);
  } else {
    window.addEventListener("resize", onResize);
  }

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

/* ---------- Utilidades de construcción ---------- */
function track(obj) { disposables.push(obj); return obj; }

function clearGroup() {
  if (!dcGroup) return;
  for (let i = dcGroup.children.length - 1; i >= 0; i--) {
    dcGroup.remove(dcGroup.children[i]);
  }
  disposables.forEach(d => { if (d && d.dispose) d.dispose(); });
  disposables.length = 0;
}

function mat(color, opts = {}) {
  return track(new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.05,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    map: opts.map ?? null,
    bumpMap: opts.bumpMap ?? null,
    bumpScale: opts.bumpScale ?? 1,
    flatShading: opts.flatShading ?? false,
  }));
}

/* Convierte un pastel muy claro de la UI en un tono de "lana teñida":
   un poco más saturado y oscuro, para que se vea el color y no salga blanco. */
function yarnColor(input) {
  const c = new THREE.Color(input);
  const hsl = {};
  c.getHSL(hsl);
  hsl.s = Math.min(1, hsl.s * 1.55 + 0.12);
  hsl.l = Math.max(0, hsl.l - 0.12);
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return c;
}

/* Textura de veta de madera (procedural) para el aro */
let _woodTex = null;
function woodTexture() {
  if (_woodTex) return _woodTex;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const x = c.getContext("2d");
  x.fillStyle = "#c4926a";
  x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * c.height;
    const a = 0.05 + Math.random() * 0.12;
    x.strokeStyle = `rgba(${120 + Math.random() * 50},${88 + Math.random() * 30},${58 + Math.random() * 20},${a})`;
    x.lineWidth = 0.5 + Math.random() * 1.6;
    x.beginPath();
    x.moveTo(0, y);
    x.bezierCurveTo(c.width * 0.33, y + (Math.random() * 8 - 4),
                    c.width * 0.66, y + (Math.random() * 8 - 4),
                    c.width, y + (Math.random() * 6 - 3));
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 1);
  t.encoding = THREE.sRGBEncoding;
  _woodTex = t;
  return t;
}

/* Textura del nombre con aspecto de lana/alambre tejido (con relieve suave) */
function makeNameTexture(name, color) {
  const c = document.createElement("canvas");
  c.width = 768; c.height = 384;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  let size = 220;
  if (name.length > 5) size = 175;
  if (name.length > 7) size = 140;
  if (name.length > 9) size = 115;
  ctx.font = `italic 600 ${size}px 'Playfair Display', Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = c.width / 2, cy = c.height / 2;

  // Sombra de apoyo (da sensación de relieve)
  ctx.save();
  ctx.shadowColor = "rgba(60,40,25,0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = color;
  ctx.fillText(name, cx, cy);
  ctx.restore();

  // Trazo del mismo tono, un poco más oscuro, para definir el "hilo"
  ctx.lineWidth = Math.max(2, size * 0.035);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.strokeText(name, cx, cy);

  const tex = track(new THREE.CanvasTexture(c));
  tex.anisotropy = 8;
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

/* Forma de estrella */
function starShape(r = 1) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/* Forma de corazón */
function heartShape(s = 1) {
  const h = new THREE.Shape();
  h.moveTo(0, -0.6 * s);
  h.bezierCurveTo(0.0 * s, -0.2 * s, 0.9 * s, 0.1 * s, 0.0 * s, 0.7 * s);
  h.bezierCurveTo(-0.9 * s, 0.1 * s, 0.0 * s, -0.2 * s, 0, -0.6 * s);
  return h;
}

function extrudeFlat(shape, depth = 0.08) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2,
  });
  g.center();
  return track(g);
}

/* ---------- Construcción del atrapasueños ---------- */
function build(state) {
  clearGroup();

  const name = state.name || "Nombre";
  const placeholder = !state.name;
  const ribbons = (state.ribbons && state.ribbons.length) ? state.ribbons : ["#EAC8C8"];
  const elements = state.elements || [];

  const R = 2.0; // radio del aro

  // --- Aro de madera (con veta) ---
  const hoop = new THREE.Mesh(
    track(new THREE.TorusGeometry(R, 0.12, 24, 120)),
    mat(WOOD, { roughness: 0.78, metalness: 0, map: woodTexture(), bumpMap: woodTexture(), bumpScale: 0.012 })
  );
  hoop.castShadow = true;
  hoop.receiveShadow = true;
  dcGroup.add(hoop);

  // --- Cordón para colgar (arriba) ---
  const loop = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.28, 0.045, 16, 48)),
    mat(WOOD_DARK, { roughness: 0.8 })
  );
  loop.position.set(0, R + 0.28, 0);
  loop.castShadow = true;
  dcGroup.add(loop);

  // --- Telaraña interior (líneas suaves) ---
  const webPts = [];
  const N = 8;
  const ring1 = [], ring2 = [];
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 / N) * i;
    ring1.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0));
    ring2.push(new THREE.Vector3(Math.cos(a + 0.4) * R * 0.5, Math.sin(a + 0.4) * R * 0.5, 0));
  }
  for (let i = 0; i < N; i++) {
    webPts.push(ring1[i], ring2[i]);
    webPts.push(ring2[i], ring2[(i + 1) % N]);
    webPts.push(ring2[i], new THREE.Vector3(0, 0, 0));
  }
  const webGeo = track(new THREE.BufferGeometry().setFromPoints(webPts));
  const webMat = track(new THREE.LineBasicMaterial({ color: 0xe3d4c2, transparent: true, opacity: 0.7 }));
  dcGroup.add(new THREE.LineSegments(webGeo, webMat));

  // --- Nombre (plano con relieve, aspecto de lana tejida) ---
  const tex = makeNameTexture(name, state.nameColor || WOOD);
  const nameMat = track(new THREE.MeshStandardMaterial({
    map: tex, bumpMap: tex, bumpScale: 0.06,
    transparent: true, alphaTest: 0.35, side: THREE.DoubleSide,
    roughness: 0.85, metalness: 0,
    opacity: placeholder ? 0.5 : 1,
  }));
  const planeW = 3.2, planeH = 1.6;
  const namePlane = new THREE.Mesh(track(new THREE.PlaneGeometry(planeW, planeH)), nameMat);
  namePlane.position.set(0, 0.15, 0.08);
  namePlane.castShadow = false; // evita una sombra rectangular fea sobre la pared
  dcGroup.add(namePlane);

  // --- Cintas colgando (más mechones, caída natural, como lana) ---
  const ribbonMats = ribbons.map(col => mat(yarnColor(col), { side: THREE.DoubleSide, roughness: 0.95 }));
  const strands = 17;
  const spread = R * 1.7;
  for (let i = 0; i < strands; i++) {
    const t = strands === 1 ? 0.5 : i / (strands - 1);
    const x = -spread / 2 + spread * t;
    // y de salida sobre el arco inferior del aro
    const yTop = -Math.sqrt(Math.max(0, R * R - x * x)) + 0.05;
    const len = 1.7 + ((i % 4) * 0.4) + Math.sin(i * 1.7) * 0.3;
    dcGroup.add(makeRibbon(x, yTop, len, ribbonMats[i % ribbonMats.length], i));
  }

  // --- Elementos decorativos ---
  const bottomY = -R - 0.2;
  if (elements.includes("pompones")) {
    [-0.55, 0, 0.55].forEach((dx, k) => {
      dcGroup.add(makePompon(dx, bottomY - 0.1, 0.15, ribbons[k % ribbons.length]));
    });
  }
  if (elements.includes("perlas")) {
    for (let i = 0; i < 5; i++) {
      const pearl = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.13, 20, 20)),
        mat(CREAM, { roughness: 0.22, metalness: 0 })
      );
      pearl.position.set(-0.5 + i * 0.25, bottomY - 0.6, 0.2);
      pearl.castShadow = true;
      dcGroup.add(pearl);
    }
  }
  if (elements.includes("estrellas")) {
    const starGeo = extrudeFlat(starShape(0.28), 0.08);
    const positions = [
      [-R - 0.15, 0.3, 0.2], [R + 0.15, -0.1, 0.2], [R - 0.4, bottomY - 0.3, 0.2],
    ];
    positions.forEach((p, i) => {
      const st = new THREE.Mesh(starGeo, mat(GOLD, { metalness: 0, roughness: 0.4 }));
      st.position.set(p[0], p[1], p[2]);
      st.rotation.z = i * 0.5;
      st.castShadow = true;
      dcGroup.add(st);
    });
  }
  if (elements.includes("corazon")) {
    const heart = new THREE.Mesh(extrudeFlat(heartShape(0.6), 0.12), mat("#F2A18A", { roughness: 0.5 }));
    heart.position.set(0, bottomY - 0.25, 0.25);
    heart.castShadow = true;
    dcGroup.add(heart);
  }
  if (elements.includes("flores")) {
    dcGroup.add(makeFlower(-R + 0.2, R - 0.45, ribbons[0]));
    dcGroup.add(makeFlower(R - 0.2, R - 0.6, ribbons[1] || ribbons[0]));
  }
  if (elements.includes("plumas")) {
    dcGroup.add(makeFeather(-R + 0.35, bottomY - 0.4, ribbons[0]));
    dcGroup.add(makeFeather(R - 0.35, bottomY - 0.7, ribbons[1] || ribbons[0]));
  }

  // Escala según el tamaño elegido
  const scale = state.size === "S" ? 0.86 : state.size === "L" ? 1.12 : 1.0;
  dcGroup.scale.setScalar(scale);
  dcGroup.position.y = 0.3 * (1 - scale) + 0.2;
}

/* Una cinta/mechón = plano fino con ondulación natural */
function makeRibbon(x, yTop, len, material, seed) {
  const segs = 20;
  const geo = track(new THREE.PlaneGeometry(0.1, len, 1, segs));
  const pos = geo.attributes.position;
  const amp = 0.16 + (seed % 3) * 0.04;
  for (let i = 0; i < pos.count; i++) {
    const vy = pos.getY(i);          // de +len/2 (arriba) a -len/2
    const f = (len / 2 - vy) / len;  // 0 arriba -> 1 abajo
    pos.setZ(i, Math.sin(f * 7 + seed) * amp * f);
    pos.setX(i, pos.getX(i) + Math.sin(f * 4 + seed * 1.3) * 0.08 * f);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.position.set(x, yTop - len / 2, Math.sin(seed) * 0.04);
  m.rotation.y = Math.sin(seed * 2) * 0.2;
  return m;
}

/* Pompón afelpado: un núcleo + muchos mechoncitos para que parezca de lana */
function makePompon(x, y, z, color) {
  const g = new THREE.Group();
  const m = mat(yarnColor(color), { roughness: 1, metalness: 0, flatShading: true });
  const core = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.2, 1)), m);
  core.castShadow = true;
  g.add(core);
  const tuft = track(new THREE.SphereGeometry(0.075, 6, 5));
  for (let i = 0; i < 34; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    const r = 0.2 + Math.random() * 0.07;
    const s = new THREE.Mesh(tuft, m);
    s.position.set(
      Math.sin(v) * Math.cos(u) * r,
      Math.sin(v) * Math.sin(u) * r,
      Math.cos(v) * r
    );
    const sc = 0.7 + Math.random() * 0.7;
    s.scale.setScalar(sc);
    s.castShadow = true;
    g.add(s);
  }
  g.position.set(x, y, z);
  return g;
}

function makeFlower(x, y, color) {
  const g = new THREE.Group();
  const petalGeo = track(new THREE.SphereGeometry(0.16, 14, 14));
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 / 5) * i;
    const petal = new THREE.Mesh(petalGeo, mat(yarnColor(color), { roughness: 0.7 }));
    petal.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0);
    petal.scale.set(1, 1, 0.5);
    petal.castShadow = true;
    g.add(petal);
  }
  const center = new THREE.Mesh(track(new THREE.SphereGeometry(0.12, 14, 14)), mat(GOLD, { roughness: 0.5 }));
  center.castShadow = true;
  g.add(center);
  g.position.set(x, y, 0.2);
  return g;
}

function makeFeather(x, y, color) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.2, 14, 14)),
    mat(yarnColor(color), { roughness: 0.8, side: THREE.DoubleSide })
  );
  blade.scale.set(0.5, 1.5, 0.12);
  blade.castShadow = true;
  g.add(blade);
  const quill = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8)),
    mat(WOOD_DARK)
  );
  quill.position.y = -0.2;
  g.add(quill);
  g.position.set(x, y, 0.2);
  g.rotation.z = (x < 0 ? 1 : -1) * 0.15;
  return g;
}

/* ---------- API pública ---------- */
function update(state) {
  currentState = state;
  if (dcGroup) build(state);
}

/* ---------- Lanzamiento ---------- */
const ok = init();
if (ok) {
  window.Dreamcatcher3D = { ready: true, update };
  // Si el configurador ya está listo, que nos pase el estado actual.
  if (typeof window.onDreamcatcher3DReady === "function") {
    window.onDreamcatcher3DReady();
  } else if (currentState) {
    build(currentState);
  }
} else {
  // Sin WebGL: ocultamos la pista de "arrastra" y dejamos el SVG de respaldo.
  const hint = document.getElementById("previewHint");
  if (hint) hint.style.display = "none";
  window.Dreamcatcher3D = { ready: false, update() {} };
}

})();
