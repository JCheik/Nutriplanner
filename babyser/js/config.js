/* =========================================================================
   CONFIGURACIÓN DE BABYSER
   -------------------------------------------------------------------------
   👉 ESTE ES EL ÚNICO ARCHIVO QUE NECESITAS TOCAR PARA LOS DATOS DE CONTACTO.
   Cambia el número de WhatsApp y el usuario de Instagram por los reales.
   ========================================================================= */

const BABYSER = {
  // ---------------------------------------------------------------------
  // 📱 NÚMERO DE WHATSAPP REAL
  // Formato internacional SIN "+", SIN espacios y SIN guiones.
  // Ejemplo para España: el 612 34 56 78 se escribe "34612345678".
  // (Ahora hay un número de EJEMPLO, cámbialo por el tuyo.)
  // ---------------------------------------------------------------------
  whatsapp: "34600000000",

  // ---------------------------------------------------------------------
  // 📸 USUARIO DE INSTAGRAM (sin la @)
  // ---------------------------------------------------------------------
  instagram: "babyser24",

  // ---------------------------------------------------------------------
  // ✉️  Email de contacto (opcional, déjalo vacío "" si no quieres mostrarlo)
  // ---------------------------------------------------------------------
  email: "",

  // ---------------------------------------------------------------------
  // 🏷️  Nombre de la marca (aparece en cabecera y pie)
  // ---------------------------------------------------------------------
  brand: "BabySer",
  tagline: "Artesanía hecha a mano para tu peque",
};

/* No hace falta tocar nada de aquí para abajo --------------------------- */

// Construye un enlace de WhatsApp con un mensaje ya escrito.
function buildWhatsAppLink(message) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${BABYSER.whatsapp}?text=${text}`;
}

// Construye el enlace al perfil de Instagram.
function buildInstagramLink() {
  return `https://instagram.com/${BABYSER.instagram}`;
}
