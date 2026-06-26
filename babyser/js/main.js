/* =========================================================================
   MAIN · Arranque de la página
   - Pinta el catálogo desde products.js
   - Conecta los enlaces de WhatsApp / Instagram desde config.js
   - Menú móvil, año del pie y dibujo decorativo del hero
   ========================================================================= */

/* ---------- Catálogo ---------- */
function renderCatalog() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map(p => {
    const media = p.image
      ? `<img src="assets/products/${p.image}" alt="${p.name}" loading="lazy" />`
      : `<span class="product-emoji" aria-hidden="true">${p.emoji || "🎁"}</span>`;
    const tag = p.tag ? `<span class="product-tag">${p.tag}</span>` : "";

    // El producto configurable lleva al configurador; el resto, a WhatsApp.
    const action = p.configurable
      ? `<a href="#configurador" class="btn btn-primary">Personalizar</a>`
      : `<a href="#" class="btn btn-primary product-order"
            data-product="${p.name}">Pedir</a>`;

    return `
      <article class="product-card">
        <div class="product-media">
          ${tag}
          ${media}
        </div>
        <div class="product-body">
          <h3>${p.name}</h3>
          <p>${p.desc}</p>
          <div class="product-foot">
            <span class="product-price"><small>desde</small> ${p.price} €</span>
            ${action}
          </div>
        </div>
      </article>`;
  }).join("");

  // Botones "Pedir" -> WhatsApp con mensaje del producto
  grid.querySelectorAll(".product-order").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const product = btn.getAttribute("data-product");
      const msg = `¡Hola ${BABYSER.brand}! 🪶 Me interesa el producto "${product}". `
        + `¿Me dais más información para personalizarlo? ¡Gracias!`;
      window.open(buildWhatsAppLink(msg), "_blank");
    });
  });
}

/* ---------- Galería (fotos + vídeos) ---------- */
function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid || typeof GALLERY === "undefined") return;

  if (!GALLERY.length) {
    // Aún no hay archivos: mostramos un aviso amable.
    grid.innerHTML = `
      <div class="gallery-empty">
        <span aria-hidden="true">📷</span>
        <p>Muy pronto, fotos y vídeos reales de nuestras piezas.</p>
      </div>`;
    return;
  }

  grid.innerHTML = GALLERY.map(item => {
    if (item.type === "video") {
      const poster = item.poster ? ` poster="assets/gallery/${item.poster}"` : "";
      return `
        <figure class="gallery-item">
          <video src="assets/gallery/${item.file}"${poster}
            controls playsinline preload="metadata" aria-label="${item.alt || "Vídeo"}"></video>
        </figure>`;
    }
    return `
      <figure class="gallery-item">
        <img src="assets/gallery/${item.file}" alt="${item.alt || ""}" loading="lazy" />
      </figure>`;
  }).join("");
}

/* ---------- Testimonios ---------- */
function renderTestimonials() {
  const box = document.getElementById("testimonials");
  if (!box || typeof TESTIMONIALS === "undefined") return;

  box.innerHTML = TESTIMONIALS.map(t => {
    const n = Math.max(1, Math.min(5, t.stars || 5));
    return `
      <figure class="testimonial">
        <div class="stars" aria-label="${n} de 5 estrellas">${"★".repeat(n)}</div>
        <blockquote>"${t.text}"</blockquote>
        <figcaption>— ${t.author}</figcaption>
      </figure>`;
  }).join("");
}

/* ---------- Enlaces de contacto ---------- */
function wireContactLinks() {
  const generalMsg = `¡Hola ${BABYSER.brand}! 🪶 Me gustaría más información sobre vuestros productos personalizados.`;
  const waLink = buildWhatsAppLink(generalMsg);

  ["contactWhatsApp", "waFloat"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.href = waLink; el.target = "_blank"; el.rel = "noopener"; }
  });

  const ig = document.getElementById("contactInstagram");
  if (ig) ig.href = buildInstagramLink();
}

/* ---------- Menú móvil ---------- */
function wireMobileNav() {
  const toggle = document.getElementById("navToggle");
  const list = document.getElementById("navList");
  if (!toggle || !list) return;

  toggle.addEventListener("click", () => {
    const open = list.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  // Cierra el menú al pulsar un enlace
  list.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => {
      list.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

/* ---------- Dibujo decorativo del hero ---------- */
function renderHeroArt() {
  const box = document.getElementById("heroDreamcatcher");
  if (!box || typeof buildDreamcatcherSVG !== "function") return;
  box.innerHTML = buildDreamcatcherSVG({
    name: "Leo",
    nameColor: "#C4926A",
    ribbons: ["#EAC8C8", "#C4D8CC", "#D4C4E8", "#E2B85C"],
    elements: ["pompones", "estrellas", "flores"],
    size: "L",
    placeholder: false,
  });
}

/* ---------- Año del pie ---------- */
function setYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
}

/* ---------- Arranque ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderCatalog();
  renderGallery();
  renderTestimonials();
  wireContactLinks();
  wireMobileNav();
  renderHeroArt();
  setYear();
  if (typeof initConfigurator === "function") initConfigurator();

  // Marca/tagline desde config (por si los cambias)
  document.querySelectorAll(".logo-text").forEach(el => el.textContent = BABYSER.brand);
});
