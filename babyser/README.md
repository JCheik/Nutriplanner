# BabySer · Web de la tienda

Web sencilla para **BabySer** (@babyser24): artesanía personalizada para bebés
y niños. Muestra los productos, deja personalizar un atrapasueños en directo y
cierra los pedidos por **WhatsApp** (no hay pago online).

## 🧰 Con qué está hecha (y por qué)

HTML + CSS + JavaScript "a pelo", **sin frameworks ni build**. Es lo más
sencillo de mantener para una tienda pequeña:

- No hay que instalar nada ni compilar: abres `index.html` y funciona.
- Se publica gratis en cualquier sitio (GitHub Pages, Netlify, etc.).
- Para cambiar un producto o un dato basta con editar un archivo de texto.

## 📂 Estructura

```
babyser/
├── index.html              ← la página
├── css/styles.css          ← todo el diseño y la paleta de colores
├── js/
│   ├── config.js           ← 👈 número de WhatsApp e Instagram (EDITA AQUÍ)
│   ├── products.js         ← 👈 catálogo de productos (añade/edita aquí)
│   ├── gallery.js          ← 👈 fotos y vídeos de "Nuestro trabajo"
│   ├── testimonials.js     ← 👈 opiniones reales de clientas
│   ├── configurator.js     ← configurador de atrapasueños (opciones y precio)
│   ├── configurator3d.js   ← previsualización 3D del atrapasueños (girable)
│   └── main.js             ← une todo (catálogo, galería, menú, enlaces)
├── vendor/three/           ← Three.js (librería 3D) guardada en el proyecto
└── assets/
    ├── products/           ← 👈 fotos de las tarjetas del catálogo
    └── gallery/            ← 👈 fotos y vídeos de la galería
```

> 🌀 **Vista 3D:** la previsualización del configurador es un atrapasueños en
> 3D que se gira arrastrando (y se acerca con la rueda/pellizco). Usa la
> librería **Three.js**, que está guardada dentro del proyecto en
> `vendor/three/` (no depende de internet). Si un navegador muy antiguo no
> soporta 3D, automáticamente muestra un dibujo 2D de respaldo.

> ℹ️ **Sobre Instagram:** el contenido (fotos, vídeos y comentarios) **no se
> puede sacar de Instagram automáticamente** porque Instagram bloquea el acceso
> de programas y lo esconde tras inicio de sesión. Hay que descargarlo a mano
> desde la app/web y meterlo como se explica abajo.

## ✏️ Cómo cambiar las cosas más habituales

### 1. Poner el número de WhatsApp real
Abre `js/config.js` y cambia `whatsapp`. Va en formato internacional **sin +**,
sin espacios y sin guiones. Ejemplo España: `612 34 56 78` → `"34612345678"`.

En el mismo archivo puedes cambiar el usuario de Instagram y el nombre de la marca.

### 2. Añadir las fotos reales de los productos
1. Copia la foto dentro de `assets/products/` (ej: `atrapasuenos-leo.jpg`).
2. Abre `js/products.js` y en ese producto pon el nombre del archivo en `image`,
   por ejemplo: `image: "atrapasuenos-leo.jpg"`.

Mientras un producto no tenga foto, se muestra un icono de adorno. No se rompe nada.

> Consejo: usa fotos más o menos cuadradas/horizontales (4:3) y comprímelas para
> que la web cargue rápido en el móvil.

### 3. Añadir fotos y vídeos a la galería "Nuestro trabajo"
1. Copia los archivos en `assets/gallery/` (fotos `.jpg`/`.png` y vídeos `.mp4`).
2. Abre `js/gallery.js` y añade un bloque por cada archivo, indicando si es
   `"image"` o `"video"`. Para vídeos puedes poner una imagen de portada (`poster`).

Mientras la lista esté vacía, la galería muestra un aviso de "muy pronto".

### 4. Poner opiniones reales de clientas
Abre `js/testimonials.js` y pega los comentarios buenos de Instagram (texto,
quién lo dice y cuántas estrellas). Los que vienen ahora son de ejemplo.

### 5. Añadir o quitar un producto
En `js/products.js`, copia un bloque `{ ... }` y cámbialo (nombre, descripción,
precio, foto). Para quitarlo, borra su bloque.

### 6. Cambiar precios o detalles del configurador
En `js/configurator.js` están las listas `PALETTE` (colores), `ELEMENTS`
(adornos y su precio) y `SIZES` (tamaños y su precio base).

## ▶️ Cómo verla en local
Abre `babyser/index.html` con doble clic en el navegador. Ya está.

(Para que carguen bien las fotos al subir muchas, puedes levantar un servidor
simple: `python3 -m http.server` dentro de la carpeta `babyser/` y abrir
`http://localhost:8000`.)

## 🎨 Diseño
- Estilo boho + pastel + infantil.
- Paleta: crema `#FDF6F0`, rosa polvo `#EAC8C8`, menta `#C4D8CC`,
  lavanda `#D4C4E8`, caramelo/madera `#C4926A`, texto tierra `#4A3728`.
- Tipografías: Playfair Display (títulos) y Nunito (cuerpo).
- Responsive, pensada sobre todo para móvil.
