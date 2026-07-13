# Nutrilp — Hoja de ruta (ideas para más adelante)

> Backlog de funcionalidades y mejoras que NO se abordan en el plan de acción actual
> (`PLAN.md`). Aquí se aparcan para priorizarlas en futuras iteraciones. Mover una entrada
> a `PLAN.md` cuando se decida trabajarla.
>
> Última actualización: 2026-06-29.

---

## Producto / funcionalidades

- [ ] **Ayuda para batch cooking (cocinar en tandas)** *(petición del usuario)*
  - Ayudar a quien cocina para varios días de una vez: detectar recetas repetidas o con
    ingredientes comunes a lo largo de la semana y proponer cocinarlas juntas, calculando la
    cantidad total a preparar (p. ej. si la misma comida aparece 3 días, sugerir cocinar ×3
    raciones de golpe y repartir en táperes).
  - Posible vista "Plan de cocinado" que agrupe por receta en lugar de por día: cuánto preparar de
    cada cosa el día de batch cooking y cómo distribuirlo en la semana.
  - Encaja con el escalado de raciones ya existente (`serving-utils` / `suggestedServings`) y con la
    agregación que ya hace la lista de la compra. Sería sobre todo una capa de presentación + cálculo.

- [ ] **Planificación compartida (en pareja / varios usuarios)** *(petición del usuario)*
  - Que dos (o más) usuarios compartan la MISMA planificación semanal, no una copia. Casos de uso:
    - **Comprar juntos**: una sola lista de la compra compartida para el plan común.
    - **Cocinar**: medidas escaladas al nº de comensales del plan, sabiendo exactamente cuánto poner.
    - **Separar en platos**: repartir una receta cocinada en raciones por persona, cada una con su
      objetivo de macros (uno puede estar en déficit y otro en mantenimiento).
  - Requiere cambio de modelo de datos: hoy el plan vive bajo `users/{uid}/weekPlan`. Habría que
    introducir un "plan compartido / hogar" (colección propia con miembros e invitaciones) y mover
    el plan (y quizá la lista de la compra / historial) a ese ámbito.
  - Requiere además: reglas de Firestore para acceso multiusuario, flujo de invitación/aceptación, y
    manejo de edición concurrente (ya existe la cola de escritura por día en `use-week-plan-state`).
  - Funcionalidad grande: toca auth/compartición, estructura de Firestore y reglas. Conviene partirla
    en fases (1: compartir plan + lista; 2: comensales y escalado; 3: reparto por persona).

- [ ] **Recibir "Compartir" desde Instagram/TikTok/redes (Web Share Target API)** *(petición del usuario)*
  - Que Nutrilp aparezca en la bandeja de "Compartir" del móvil: al compartir un reel/post desde
    Instagram, TikTok, etc., el usuario elige Nutrilp y la app recibe la URL y la importa.
  - Requiere: declarar `share_target` en el manifest PWA (`src/app/manifest.ts`) apuntando a una
    ruta receptora (p. ej. `/share`) con `method`/`params` (`url`, `text`, `title`). La PWA debe
    estar **instalada** y servirse por HTTPS (ya cumplido con App Hosting + nutrilp.com).
  - Encaja directo con el flujo de importar receta por URL ya existente
    (`import-recipe-flow` + `recipe-import-dialog`): la ruta receptora reusa ese pipeline.
  - Nota: solo Android/Chrome admite share_target hoy; iOS no. En iOS quedaría el copy-paste de URL.

- [ ] **Escanear código de barras con el móvil** *(petición del usuario)*
  - Leer el código de barras de un producto (cámara del móvil) para identificarlo y traer sus
    datos nutricionales (kcal/macros por 100 g) a un ingrediente o receta.
  - Requiere: acceso a cámara (PWA, `getUserMedia` + un lector de códigos, p. ej.
    `BarcodeDetector` nativo donde exista, o librería tipo `zxing`/`quagga` como fallback) y
    una fuente de datos (Open Food Facts es gratuita y abierta).
  - Encaja con el flujo de "Escanear Nevera" ya existente.

- [ ] **Importar receta desde texto libre** (además de URL).
  - Pegar el texto de una receta y que la IA la estructure (hoy solo se importa por URL).

- [ ] **Compartir receta hacia fuera** (enlace o imagen para redes sociales).
  - Distinto de recibir compartidos: aquí el usuario comparte una receta SUYA a redes.

- [x] **Acceso al historial de semanas desde móvil** *(HECHO 2026-06-29)*
  - Chip "Historial" en la cabecera del planificador móvil (`mobile-page-content.tsx`) que abre el
    mismo `WeekHistorySheet` (ahora responsive en móvil). Reusa `useWeekHistory` / `handleRestoreWeek`.

- [ ] **Progreso de macros diario** — gráfica de consumido vs. objetivo del día.
  - Nota: descartado para el uso principal (la app es para planificar la semana, no registrar cada
    ingesta). Reconsiderar solo si surge la necesidad.

- [ ] **Filtro por dieta más allá del slot** — aplicar `dietPreference` también en la
  biblioteca de recetas, no solo al añadir a un slot.

- [x] **Fotos en recetas** *(HECHO 2026-07-01)*
  - Subida manual habilitada para todos los usuarios (antes solo admin), con preview y opción de
    quitar en `recipe-dialog.tsx`.
  - Importar desde URL añade foto automáticamente: fotograma capturado del vídeo subido
    (`media-utils.ts: captureVideoFrame`) o el `og:image` del post, re-alojado en Storage
    (`fetch-social-url/route.ts` descarga la imagen server-side para evitar hotlinking roto).
  - **Pendiente de revisar antes de un lanzamiento público**: re-alojar el `og:image` de un post de
    Instagram/TikTok/etc. implica guardar una copia de contenido de terceros. Vale para la alfa
    entre conocidos (uso privado, no redistribución), pero antes de abrir la app a más gente conviene
    decidir: (a) limitarlo a uso estrictamente privado del usuario, (b) pedir siempre confirmación
    explícita antes de guardar la imagen ajena, o (c) quitar el auto-import de `og:image` y dejar solo
    la captura de fotograma de vídeos que el propio usuario sube.
  - **Mejora futura**: hoy el fotograma se toma a un porcentaje fijo del vídeo (85% de la duración).
    Se podría pedirle a Gemini (que ya analiza el vídeo al importar) que indique el timestamp donde
    se ve el plato ya montado/emplatado, y capturar ese frame en vez de uno fijo — mejor resultado,
    mismo coste (la llamada a Gemini ya se hace).

---

## Marca / Nutrilp

- [~] **Iconos y logo PWA** con la identidad de Nutrilp.
  - HECHO (provisional): `public/icons/icon-192x192.png` y `icon-512x512.png` con la "N" en
    terracota de marca (`#D9521A`, recoloreada 2026-07-01 desde el verde original) sobre fondo
    crema. Falta el set definitivo cuando haya diseño final: favicon, versión maskable propia y
    logo de cabecera (`Logo` sigue siendo el genérico).

- [ ] **Onboarding** adaptado a la marca y al flujo simplificado (revisar `WelcomeGuide`).

---

## Infraestructura / dominio

- [x] **Firebase App Hosting + dominio `nutrilp.com`**.
  - HECHO: backend `nutriplanner` en App Hosting (europe-west4), `nutrilp.com` añadido a
    **Auth → Dominios autorizados**, DNS en Cloudflare (proxy desactivado), SSL provisionando.
  - Billing de Gemini activado + alerta de presupuesto. Reglas Firestore publicadas.

- [ ] **OG tags** en `layout.tsx` (`openGraph.url`, `openGraph.siteName`, imagen de
  previsualización con la marca Nutrilp).

---

## Verificación pendiente (cuando propague nutrilp.com)

- [ ] **Probar el flujo real en producción** (no verificable en el preview por el login Google):
  login con Google, crear receta con IA, escanear nevera desde el asistente (móvil), guardar/cargar
  una semana del historial, instalar la PWA en un móvil real.
