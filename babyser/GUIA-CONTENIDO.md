# 📋 Guía: cómo añadir fotos, vídeos y opiniones reales

La idea importante: **no hace falta tocar código**. Tú consigues los archivos y
los textos, se los pasas a Claude por el chat (igual que las capturas de
Instagram), y se colocan en su sitio. Aquí va el "cómo conseguirlos".

---

## 📸 1. Fotos de los productos

**La forma más fácil y con mejor calidad:** las fotos originales seguramente ya
están en la **galería del móvil** (las hiciste tú antes de subirlas a
Instagram). Úsalas desde ahí: se ven mejor que si las vuelves a bajar de
Instagram (Instagram las recomprime).

Si solo las tienes en Instagram, la vía oficial para recuperarlas todas en buena
calidad:

1. App de Instagram → tu perfil → menú **☰** → **Tu actividad** →
   **Descargar tu información**.
2. Pides la descarga: te llega al correo un enlace con un ZIP que trae todas
   tus fotos y vídeos.

**Qué hace falta:** unas **6–9 fotos** de las mejores piezas para la galería y,
si quieres, una foto buena por cada tipo de producto del catálogo
(atrapasueños, chupetero, llavero, mordedor, collar, decoración). Mejor más
anchas que altas, pero vale cualquiera.

---

## 🎥 2. Vídeos / reels

- Si tienes los **vídeos originales en el móvil**, mejor esos.
- Si solo están como reel en Instagram: salen también en esa misma
  **"Descargar tu información"**. O, rápido: **graba la pantalla** del móvil
  mientras reproduces el reel.
- Con **1 a 3 vídeos** cortos es suficiente para la galería.

---

## 💬 3. Opiniones reales

1. Entra en los **comentarios** de tus publicaciones y en los **mensajes (DM)**
   donde la gente diga cosas bonitas.
2. **Copia el texto** del comentario y apunta **quién lo dice** (con el nombre y
   "mamá/papá de [peque]" basta, p. ej. *"Marta, mamá de Lucía"*).
   - Si te da pereza copiar a mano, haz una **captura del comentario** y se
     transcribe.
3. Con **3 a 6 opiniones** queda genial.

> Detalle majo: si la persona se reconoce mucho, deja solo el nombre de pila. Y
> si puedes, pídele un "¿te importa que ponga tu comentario en la web?": queda
> más profesional.

---

## 📦 Cómo pasarlo

Súbelo por el chat (fotos, vídeos y los textos de las opiniones), todo junto o
por tandas. Desde ahí se hace lo demás:

- meter cada archivo en su carpeta (`assets/products/` o `assets/gallery/`),
- enlazarlo en el catálogo y/o en la galería,
- escribir las opiniones en su sitio,
- y enviarte capturas/vídeo para que veas cómo queda antes de darlo por bueno.

---

## 🛠️ ¿Y si algún día lo quieres hacer tú mismo?

Está todo explicado en el `README.md` (apartados "Cómo cambiar las cosas más
habituales"). En resumen:

- **Foto de un producto del catálogo:** copia la foto en `assets/products/` y
  pon su nombre en `image` dentro de `js/products.js`.
- **Galería (fotos y vídeos):** copia los archivos en `assets/gallery/` y añade
  un bloque por cada uno en `js/gallery.js`.
- **Opiniones:** pega los comentarios en `js/testimonials.js`.
