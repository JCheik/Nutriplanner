# Nutrilp — Checklist de lanzamiento alfa

> Camino mínimo para poner la app en manos de testers reales (alfa cerrado).
> Distinto de [`HOJA-DE-RUTA.md`](./HOJA-DE-RUTA.md), que recoge mejoras post-alfa.
>
> Última actualización: 2026-07-11.

## ✅ Hecho (desde la revisión de 2026-06-25)

- [x] **Desplegar en HTTPS** — Firebase App Hosting (backend `nutriplanner`, europe-west4),
  despliegue automático con cada push a `main`. `GEMINI_API_KEY` en Secret Manager.
  Micrófono/voz y cámara (código de barras) funcionan en producción por ser contexto seguro.
- [x] **Reglas publicadas** — Firestore desplegadas (incluida la subcolección `diary`).
- [x] **Descargo nutricional** — visible en el login y en Objetivos.
- [x] **Branding Nutrilp** — iconos PWA (`public/icons/`) ya son la "N" de Nutrilp.
- [x] **Login sin Google** — email + contraseña con registro, reset y errores en español.
  Ventaja extra: los testers que entren por correo NO pasan por el consentimiento OAuth de
  Google, así que el modo "testing" de OAuth deja de ser un requisito para ellos.
- [x] **QA completa de los flujos nuevos** (2026-07-11, cuenta `prueba-claude@example.com`):
  plan con "comido", productos + Open Food Facts (búsqueda vía proxy propio por CORS),
  temporizadores del modo cocina, Perfil (peso/progreso/objetivos), lista de la compra.

## 🔴 Bloqueante real que queda (uno)

- [ ] **Facturación de Gemini / Google AI.** El free tier son **20 requests/día para TODA la
  clave** (no por usuario): con 3-4 testers usando autocompletar, importar reels y el asistente,
  se agota en una tarde y la IA da error el resto del día para todos.
  - Alta de facturación + **límite de presupuesto con alertas** (5–10 €/mes sobra de margen;
    `gemini-2.5-flash` cuesta fracciones de céntimo por petición — un alfa de 5 personas son
    unos pocos euros al mes).
  - Alternativa consciente si se pospone: lanzar avisando de que "la IA tiene cupo diario
    limitado" — la app es usable en modo manual, pero la primera impresión de la IA será mala.

## 🟠 Pequeños, recomendados antes de invitar a nadie

- [ ] **Plantillas de email de Firebase Auth en español** — el correo de "restablecer
  contraseña" sale en inglés por defecto. Consola → Authentication → Templates → idioma.
  (1 minuto; relevante ahora que existe el login por correo.)
- [ ] **Canal de feedback** — botón "Enviar feedback" (mailto) en Perfil. Es el sentido del alfa.
  (~15 min de código.)
- [ ] **Pasada en móviles reales** — todo lo anterior está verificado en navegador emulado;
  falta 1 pasada en vuestros teléfonos: escanear un código de barras real con la cámara,
  instalar la PWA, y el micrófono del asistente. 15 minutos entre los dos.
- [ ] **Copia de seguridad de Firestore** — activar PITR (point-in-time recovery) o exports
  programados en la consola. Un toggle; perder los datos de un tester sería la peor primera
  impresión posible.

## 🟢 No bloquean (post-alfa)

- Facturación aparte, todo lo del 2026-06-25 que sigue pendiente vive en `HOJA-DE-RUTA.md`.
- Dominio propio (hoy se comparte la URL larga de `*.hosted.app`; funciona, solo es fea).
- Registro abierto: cualquiera con la URL puede crearse cuenta por correo. Para un alfa cerrado
  entre conocidos basta con no difundir la URL; si el grupo crece, restringir registro.

## Camino mínimo a alfa (estado real)

1. ~~Deploy HTTPS + reglas + descargo + branding~~ ✅
2. Activar facturación de Gemini + límites de gasto ← **único bloqueante**
3. Plantillas de auth en español + botón de feedback + backup (una tarde)
4. Pasada en móviles reales con el código de barras y la PWA
5. Invitar testers (por correo ya no hace falta tocar OAuth)
