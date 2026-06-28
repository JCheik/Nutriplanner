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
  // Gestión de color correcta para esta versión de Three.js (r137)
  renderer.outputEncoding = THREE.sRGBEncoding;

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

  // Luces suaves y cálidas (intensidades moderadas para que los pasteles y la
  // madera no se "laven" y conserven su color).
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9dccb, 0.7));
  const key = new THREE.DirectionalLight(0xfff4e8, 0.75);
  key.position.set(3, 4, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe9d6, 0.35);
  fill.position.set(-4, -2, 3);
  scene.add(fill);

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
  }));
}

/* Textura de canvas con el nombre escrito (estilo manuscrito) */
function makeNameTexture(name, color) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  let size = 150;
  if (name.length > 5) size = 120;
  if (name.length > 7) size = 95;
  if (name.length > 9) size = 78;
  ctx.font = `italic 600 ${size}px 'Playfair Display', Georgia, serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, c.width / 2, c.height / 2);
  const tex = track(new THREE.CanvasTexture(c));
  tex.anisotropy = 4;
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

  // --- Aro de madera ---
  const hoop = new THREE.Mesh(
    track(new THREE.TorusGeometry(R, 0.11, 20, 80)),
    mat(WOOD, { roughness: 0.6 })
  );
  dcGroup.add(hoop);

  // --- Cordón para colgar (arriba) ---
  const loop = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.28, 0.04, 12, 40)),
    mat(WOOD_DARK)
  );
  loop.position.set(0, R + 0.28, 0);
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

  // --- Nombre (textura en un plano dentro del aro) ---
  const tex = makeNameTexture(name, state.nameColor || WOOD);
  const nameMat = track(new THREE.MeshBasicMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide,
    opacity: placeholder ? 0.45 : 1,
  }));
  const planeW = 3.0, planeH = 1.5;
  const namePlane = new THREE.Mesh(track(new THREE.PlaneGeometry(planeW, planeH)), nameMat);
  namePlane.position.set(0, 0.15, 0.06);
  dcGroup.add(namePlane);

  // --- Cintas colgando ---
  const strands = 11;
  const spread = R * 1.5;
  for (let i = 0; i < strands; i++) {
    const t = strands === 1 ? 0.5 : i / (strands - 1);
    const x = -spread / 2 + spread * t;
    // y de salida sobre el arco inferior del aro
    const yTop = -Math.sqrt(Math.max(0, R * R - x * x)) + 0.05;
    const len = 1.6 + ((i % 3) * 0.45) + Math.sin(i * 1.7) * 0.25;
    const color = ribbons[i % ribbons.length];
    dcGroup.add(makeRibbon(x, yTop, len, color, i));
  }

  // --- Elementos decorativos ---
  const bottomY = -R - 0.2;
  if (elements.includes("pompones")) {
    [-0.55, 0, 0.55].forEach((dx, k) => {
      const pom = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.26, 18, 18)),
        mat(ribbons[k % ribbons.length], { roughness: 0.95 })
      );
      pom.position.set(dx, bottomY - 0.1, 0.15);
      dcGroup.add(pom);
    });
  }
  if (elements.includes("perlas")) {
    for (let i = 0; i < 5; i++) {
      const pearl = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.13, 16, 16)),
        mat(CREAM, { roughness: 0.3, metalness: 0.2 })
      );
      pearl.position.set(-0.5 + i * 0.25, bottomY - 0.6, 0.2);
      dcGroup.add(pearl);
    }
  }
  if (elements.includes("estrellas")) {
    const starGeo = extrudeFlat(starShape(0.28), 0.08);
    const positions = [
      [-R - 0.15, 0.3, 0.2], [R + 0.15, -0.1, 0.2], [R - 0.4, bottomY - 0.3, 0.2],
    ];
    positions.forEach((p, i) => {
      const st = new THREE.Mesh(starGeo, mat(GOLD, { metalness: 0.3, roughness: 0.4 }));
      st.position.set(p[0], p[1], p[2]);
      st.rotation.z = i * 0.5;
      dcGroup.add(st);
    });
  }
  if (elements.includes("corazon")) {
    const heart = new THREE.Mesh(extrudeFlat(heartShape(0.6), 0.12), mat("#F2A18A", { roughness: 0.5 }));
    heart.position.set(0, bottomY - 0.25, 0.25);
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

/* Una cinta = plano fino con ligera ondulación */
function makeRibbon(x, yTop, len, color, seed) {
  const segs = 14;
  const geo = track(new THREE.PlaneGeometry(0.13, len, 1, segs));
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vy = pos.getY(i);          // de +len/2 (arriba) a -len/2
    const f = (len / 2 - vy) / len;  // 0 arriba -> 1 abajo
    pos.setZ(i, Math.sin(f * 6 + seed) * 0.12 * f);
    pos.setX(i, pos.getX(i) + Math.sin(f * 3 + seed) * 0.05 * f);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { side: THREE.DoubleSide, roughness: 0.85 }));
  m.position.set(x, yTop - len / 2, 0);
  return m;
}

function makeFlower(x, y, color) {
  const g = new THREE.Group();
  const petalGeo = track(new THREE.SphereGeometry(0.16, 12, 12));
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 / 5) * i;
    const petal = new THREE.Mesh(petalGeo, mat(color, { roughness: 0.7 }));
    petal.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0);
    petal.scale.set(1, 1, 0.5);
    g.add(petal);
  }
  const center = new THREE.Mesh(track(new THREE.SphereGeometry(0.12, 12, 12)), mat(GOLD, { roughness: 0.5 }));
  g.add(center);
  g.position.set(x, y, 0.2);
  return g;
}

function makeFeather(x, y, color) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.2, 14, 14)),
    mat(color, { roughness: 0.8, side: THREE.DoubleSide })
  );
  blade.scale.set(0.5, 1.5, 0.12);
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
