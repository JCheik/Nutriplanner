/* =========================================================================
   CATÁLOGO DE PRODUCTOS
   -------------------------------------------------------------------------
   👉 PARA AÑADIR O EDITAR UN PRODUCTO: copia un bloque { ... } y cámbialo.

   - image:  nombre del archivo de la foto dentro de la carpeta
             "assets/products/". Cuando subas las fotos reales, ponlas ahí
             y escribe aquí el nombre exacto (ej: "atrapasuenos-leo.jpg").
             Mientras no haya foto, déjalo como "" y saldrá un dibujo bonito.
   - price:  precio "desde" en euros (solo el número).
   - tag:    etiqueta pequeña que sale sobre la tarjeta (opcional, "").
   ========================================================================= */

const PRODUCTS = [
  {
    id: "atrapasuenos",
    name: "Atrapasueños personalizado",
    desc: "Con el nombre del peque, cintas de colores y elementos a elegir. Nuestro producto estrella.",
    price: 22,
    tag: "Más vendido",
    image: "",
    emoji: "🌙",
    configurable: true, // este producto enlaza al configurador
    featured: true,     // se muestra como tarjeta destacada (más grande)
  },
  {
    id: "chupetero",
    name: "Chupetero personalizado",
    desc: "Sujeta-chupetes con el nombre en bolitas de silicona y madera. Apto para bebés.",
    price: 12,
    tag: "",
    image: "",
    emoji: "🍼",
  },
  {
    id: "llavero",
    name: "Llavero para mochila",
    desc: "Llavero con nombre para personalizar mochilas del cole o bolsos. ¡Que no se pierda!",
    price: 9,
    tag: "",
    image: "",
    emoji: "🎒",
  },
  {
    id: "mordedor",
    name: "Mordedor de madera",
    desc: "Mordedores de madera natural y silicona, suaves para las encías del bebé.",
    price: 10,
    tag: "",
    image: "",
    emoji: "🦷",
  },
  {
    id: "collar-lactancia",
    name: "Collar de lactancia",
    desc: "Collar de silicona y madera, ideal para entretener al bebé durante la toma.",
    price: 14,
    tag: "",
    image: "",
    emoji: "📿",
  },
  {
    id: "decoracion-nombre",
    name: "Decoración con nombre",
    desc: "Nombres tejidos, arcoíris y detalles para decorar la habitación del peque.",
    price: 16,
    tag: "",
    image: "",
    emoji: "🌈",
  },
];
