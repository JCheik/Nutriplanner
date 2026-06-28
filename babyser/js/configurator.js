/* =========================================================================
   CONFIGURADOR DE ATRAPASUEÑOS
   Previsualización en vivo (SVG) + precio estimado + pedido por WhatsApp.
   ========================================================================= */

/* ---------- Opciones (fáciles de editar) ---------- */

// Colores disponibles para cintas y nombre. {name, hex}
const PALETTE = [
  { name: "Rosa polvo", hex: "#EAC8C8" },
  { name: "Menta", hex: "#C4D8CC" },
  { name: "Lavanda", hex: "#D4C4E8" },
  { name: "Caramelo", hex: "#C4926A" },
  { name: "Crema", hex: "#F3E7D8" },
  { name: "Mostaza", hex: "#E2B85C" },
  { name: "Azul bebé", hex: "#A9C8E0" },
  { name: "Verde agua", hex: "#9FD3C7" },
  { name: "Coral", hex: "#F2A18A" },
  { name: "Gris perla", hex: "#CDC4BE" },
];

// Elementos decorativos: nombre + emoji + precio extra (€)
const ELEMENTS = [
  { id: "pompones", name: "Pompones", emoji: "⚪", price: 2 },
  { id: "plumas", name: "Plumas", emoji: "🪶", price: 2 },
  { id: "estrellas", name: "Estrellas", emoji: "⭐", price: 2 },
  { id: "flores", name: "Flores", emoji: "🌸", price: 3 },
  { id: "perlas", name: "Perlas", emoji: "🔘", price: 2 },
  { id: "corazon", name: "Corazón", emoji: "💛", price: 2 },
];

// Tamaños: etiqueta, descripción (cm) y precio base (€)
const SIZES = [
  { id: "S", label: "S", desc: "≈ 15 cm", price: 18 },
  { id: "M", label: "M", desc: "≈ 20 cm", price: 22 },
  { id: "L", label: "L", desc: "≈ 25 cm", price: 28 },
];

/* ---------- Estado del configurador ---------- */
const state = {
  name: "",
  nameColor: PALETTE[3].hex,   // caramelo por defecto
  ribbons: [PALETTE[0].hex, PALETTE[1].hex, PALETTE[2].hex], // rosa, menta, lavanda
  elements: ["pompones"],
  size: "M",
};
const MAX_RIBBONS = 4;

/* ---------- Helpers ---------- */
function getSize() { return SIZES.find(s => s.id === state.size); }

function estimatePrice() {
  let total = getSize().price;
  state.elements.forEach(id => {
    const el = ELEMENTS.find(e => e.id === id);
    if (el) total += el.price;
  });
  return total;
}

/* ---------- Render de controles ---------- */
function renderNameColor() {
  const box = document.getElementById("cfgNameColor");
  box.innerHTML = "";
  PALETTE.forEach(c => {
    const s = document.createElement("button");
    s.type = "button";
    s.className = "swatch" + (state.nameColor === c.hex ? " selected" : "");
    s.style.background = c.hex;
    s.title = c.name;
    s.setAttribute("aria-label", "Nombre en " + c.name);
    s.addEventListener("click", () => {
      state.nameColor = c.hex;
      renderNameColor();
      renderPreview();
    });
    box.appendChild(s);
  });
}

function renderRibbons() {
  const box = document.getElementById("cfgRibbons");
  box.innerHTML = "";
  PALETTE.forEach(c => {
    const selected = state.ribbons.includes(c.hex);
    const s = document.createElement("button");
    s.type = "button";
    s.className = "swatch" + (selected ? " selected" : "");
    s.style.background = c.hex;
    s.title = c.name;
    s.setAttribute("aria-label", "Cinta " + c.name);
    s.addEventListener("click", () => {
      if (selected) {
        state.ribbons = state.ribbons.filter(h => h !== c.hex);
      } else if (state.ribbons.length < MAX_RIBBONS) {
        state.ribbons.push(c.hex);
      }
      renderRibbons();
      renderPreview();
    });
    box.appendChild(s);
  });
}

function renderElements() {
  const box = document.getElementById("cfgElements");
  box.innerHTML = "";
  ELEMENTS.forEach(el => {
    const selected = state.elements.includes(el.id);
    const c = document.createElement("button");
    c.type = "button";
    c.className = "chip" + (selected ? " selected" : "");
    c.innerHTML = `${el.emoji} ${el.name}`;
    c.addEventListener("click", () => {
      if (selected) state.elements = state.elements.filter(id => id !== el.id);
      else state.elements.push(el.id);
      renderElements();
      renderPreview();
    });
    box.appendChild(c);
  });
}

function renderSizes() {
  const box = document.getElementById("cfgSize");
  box.innerHTML = "";
  SIZES.forEach(sz => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "size-btn" + (state.size === sz.id ? " selected" : "");
    b.innerHTML = `${sz.label}<small>${sz.desc}</small>`;
    b.addEventListener("click", () => {
      state.size = sz.id;
      renderSizes();
      renderPreview();
    });
    box.appendChild(b);
  });
}

/* ---------- Render de la previsualización ---------- */
let _lastPriceText = null;
function renderPreview() {
  // Etiquetas de precio / tamaño (siempre)
  document.getElementById("previewSizeLabel").textContent = "Tamaño " + state.size;

  const priceEl = document.getElementById("previewPrice");
  const priceText = estimatePrice() + " €";
  priceEl.textContent = priceText;
  // Pequeña animación cuando el precio cambia
  if (_lastPriceText !== null && _lastPriceText !== priceText) {
    priceEl.classList.remove("bump");
    void priceEl.offsetWidth; // reinicia la animación
    priceEl.classList.add("bump");
  }
  _lastPriceText = priceText;

  // Si hay 3D disponible, lo usamos; si no, dibujo SVG de respaldo.
  if (window.Dreamcatcher3D && window.Dreamcatcher3D.ready) {
    window.Dreamcatcher3D.update(state);
    return;
  }

  const stage = document.getElementById("previewStage");
  if (!stage) return;
  stage.innerHTML = buildDreamcatcherSVG({
    name: state.name || "Nombre",
    nameColor: state.nameColor,
    ribbons: state.ribbons.length ? state.ribbons : ["#EAC8C8"],
    elements: state.elements,
    size: state.size,
    placeholder: !state.name,
  });
}

// El módulo 3D nos avisa cuando está listo para que le pasemos el estado.
window.onDreamcatcher3DReady = function () { renderPreview(); };

/* Construye el SVG del atrapasueños según el estado */
function buildDreamcatcherSVG(opt) {
  const W = 300, H = 400;
  const cx = W / 2;
  const cy = 120;
  // El aro crece con la talla
  const radius = opt.size === "S" ? 78 : opt.size === "L" ? 100 : 90;

  // --- Cintas colgando ---
  const ribbonCount = 9;
  const spread = radius * 1.5;
  const startX = cx - spread / 2;
  let ribbons = "";
  for (let i = 0; i < ribbonCount; i++) {
    const x = startX + (spread / (ribbonCount - 1)) * i;
    const color = opt.ribbons[i % opt.ribbons.length];
    const len = 150 + ((i % 3) * 28) + (Math.sin(i) * 14);
    const topY = cy + radius - 8;
    const sway = (i % 2 === 0 ? 8 : -8);
    ribbons += `<path d="M ${x} ${topY} q ${sway} ${len/2} 0 ${len}"
      stroke="${color}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.92"/>`;
  }

  // --- Aro (madera) ---
  const hoop = `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
      stroke="#C4926A" stroke-width="9"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
      stroke="#a9784f" stroke-width="2" stroke-dasharray="3 7" opacity="0.6"/>
    <!-- cordón de colgar -->
    <path d="M ${cx} ${cy - radius} q -16 -28 0 -44 q 16 16 0 44"
      fill="none" stroke="#C4926A" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy - radius - 46}" r="4" fill="#C4926A"/>
  `;

  // --- Telaraña interior suave ---
  let web = "";
  for (let a = 0; a < 8; a++) {
    const ang = (Math.PI / 4) * a;
    const x2 = cx + Math.cos(ang) * radius;
    const y2 = cy + Math.sin(ang) * radius;
    web += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#e8d8c8" stroke-width="1"/>`;
  }
  web += `<circle cx="${cx}" cy="${cy}" r="${radius*0.55}" fill="none" stroke="#e8d8c8" stroke-width="1"/>`;
  web += `<circle cx="${cx}" cy="${cy}" r="${radius*0.28}" fill="none" stroke="#e8d8c8" stroke-width="1"/>`;

  // --- Nombre (texto curvado tipo script) ---
  const fontSize = opt.name.length > 7 ? 26 : opt.name.length > 5 ? 32 : 38;
  const name = `
    <text x="${cx}" y="${cy + 10}" text-anchor="middle"
      font-family="'Playfair Display', serif" font-style="italic"
      font-weight="600" font-size="${fontSize}"
      fill="${opt.nameColor}" opacity="${opt.placeholder ? 0.4 : 1}">${escapeXML(opt.name)}</text>
  `;

  // --- Elementos decorativos ---
  let deco = "";
  const topY = cy - radius;
  if (opt.elements.includes("flores")) {
    deco += flower(cx - radius + 10, cy - radius + 18, opt.ribbons[0]);
    deco += flower(cx + radius - 14, cy - radius + 26, opt.ribbons[1] || opt.ribbons[0]);
  }
  if (opt.elements.includes("estrellas")) {
    deco += star(cx - radius - 6, cy + 6, 9, "#E2B85C");
    deco += star(cx + radius + 4, cy - 18, 7, "#E2B85C");
    deco += star(cx + radius - 30, cy + radius + 40, 8, "#E2B85C");
  }
  if (opt.elements.includes("corazon")) {
    deco += heart(cx, cy + radius + 18, 11, "#F2A18A");
  }
  if (opt.elements.includes("pompones")) {
    const colors = opt.ribbons;
    [-1, 0, 1].forEach((k, i) => {
      const x = cx + k * 34;
      deco += `<circle cx="${x}" cy="${cy + radius + 38}" r="13"
        fill="${colors[i % colors.length]}" />
        <circle cx="${x}" cy="${cy + radius + 38}" r="13" fill="none"
        stroke="#ffffff" stroke-width="1" stroke-dasharray="2 3" opacity="0.7"/>`;
    });
  }
  if (opt.elements.includes("perlas")) {
    for (let i = 0; i < 5; i++) {
      const x = cx - 40 + i * 20;
      deco += `<circle cx="${x}" cy="${cy + radius + 70}" r="6" fill="#F3E7D8" stroke="#d8c4ae" stroke-width="1"/>`;
    }
  }
  if (opt.elements.includes("plumas")) {
    deco += feather(cx - radius + 6, cy + radius + 70, opt.ribbons[0]);
    deco += feather(cx + radius - 18, cy + radius + 86, opt.ribbons[1] || opt.ribbons[0]);
  }

  return `
  <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista previa del atrapasueños">
    ${ribbons}
    ${web}
    ${hoop}
    ${deco}
    ${name}
  </svg>`;
}

/* ---------- Formas decorativas reutilizables ---------- */
function flower(x, y, color) {
  let petals = "";
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 / 5) * i;
    petals += `<circle cx="${x + Math.cos(a)*7}" cy="${y + Math.sin(a)*7}" r="6" fill="${color}"/>`;
  }
  return `<g>${petals}<circle cx="${x}" cy="${y}" r="5" fill="#E2B85C"/></g>`;
}
function star(x, y, r, color) {
  let pts = "";
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r / 2.3;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts += `${x + Math.cos(a)*rad},${y + Math.sin(a)*rad} `;
  }
  return `<polygon points="${pts.trim()}" fill="${color}"/>`;
}
function heart(x, y, s, color) {
  return `<path d="M ${x} ${y + s*0.9}
    C ${x - s*1.6} ${y - s*0.4}, ${x - s*0.5} ${y - s*1.3}, ${x} ${y - s*0.2}
    C ${x + s*0.5} ${y - s*1.3}, ${x + s*1.6} ${y - s*0.4}, ${x} ${y + s*0.9} Z"
    fill="${color}"/>`;
}
function feather(x, y, color) {
  return `<g opacity="0.95">
    <path d="M ${x} ${y} q 6 26 0 52" stroke="#a9784f" stroke-width="2" fill="none"/>
    <path d="M ${x} ${y+8} q 16 6 14 30 q -10 -10 -14 -6 q 0 -14 0 -24 Z" fill="${color}"/>
    <path d="M ${x} ${y+8} q -16 6 -14 30 q 10 -10 14 -6 q 0 -14 0 -24 Z" fill="${color}" opacity="0.8"/>
  </g>`;
}

function escapeXML(s) {
  return String(s).replace(/[<>&'"]/g, c => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]
  ));
}

/* ---------- Mensaje de pedido por WhatsApp ---------- */
function buildOrderMessage() {
  const sz = getSize();
  const elNames = state.elements.length
    ? state.elements.map(id => ELEMENTS.find(e => e.id === id).name).join(", ")
    : "ninguno";
  const ribbonNames = state.ribbons
    .map(h => (PALETTE.find(c => c.hex === h) || {}).name || h)
    .join(", ");
  const nameColorName = (PALETTE.find(c => c.hex === state.nameColor) || {}).name || state.nameColor;

  return (
`¡Hola BabySer! 🪶 Quiero pedir un atrapasueños personalizado:

• Nombre: ${state.name || "(por confirmar)"}
• Color del nombre: ${nameColorName}
• Colores de cintas: ${ribbonNames}
• Elementos: ${elNames}
• Tamaño: ${sz.label} (${sz.desc})
• Precio estimado: ${estimatePrice()} €

¿Me confirmáis disponibilidad y precio final? ¡Gracias!`
  );
}

/* ---------- Inicialización del configurador ---------- */
function initConfigurator() {
  if (!document.getElementById("configForm")) return;

  renderNameColor();
  renderRibbons();
  renderElements();
  renderSizes();
  renderPreview();

  const nameInput = document.getElementById("cfgName");
  nameInput.addEventListener("input", () => {
    state.name = nameInput.value.trim();
    renderPreview();
  });

  document.getElementById("cfgOrderBtn").addEventListener("click", () => {
    window.open(buildWhatsAppLink(buildOrderMessage()), "_blank");
  });
}
