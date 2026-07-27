# Plan — App nativa de Nutrilp

> Iniciado 2026-07-23. Bocetos de referencia: `.claude/bocetos-app-nativa.html` (v2, 14 jul).
> Código: carpeta `native/` en este mismo repo.

## ⭐ El norte del producto (palabras del usuario, 2026-07-23)

**Nutrilp ayuda a organizar el plan de comidas semanal: para no tirar comida y para poder
seguir un plan, tener una organización.** NO buscamos lo que buscan las otras apps
(MyFitnessPal y compañía): llevar un registro diario de cada ingesta. Esto es una
herramienta de **organización**, no de tracking.

Consecuencias de diseño — cada pantalla se mide contra esto:

1. **La semana es el corazón**, no el día. El cuadrante (días × comidas, tipo horario del
   cole) es la vista central de la app; "Hoy" es solo la lente cómoda de ese plan para el
   día en curso.
2. **El anillo de calorías de "Hoy" se queda** (es el sello visual de la marca), pero
   representa *seguimiento del plan* — marcar "me lo he comido" sobre comidas YA
   planificadas descuenta del anillo. **No hay registro libre de alimentos** fuera del
   plan, ni lo habrá. El copy nunca habla de "registrar", habla de "seguir tu plan".
3. **La pestaña "Progreso" del boceto de Perfil (pantalla 9) NO se construye** — peso
   diario y gráfica de calorías de 7 días son registro diario puro. Ya se quitó de
   escritorio (2026-07-15) y HOJA-DE-RUTA ya lo descartaba ("la app es para planificar
   la semana, no registrar cada ingesta"). Perfil queda: **Objetivos · Entrevista ·
   Historial** (ver mapa de pantallas).
4. **"No tirar comida" es un objetivo de primera clase**: la lista de la compra escalada a
   raciones reales (comprar lo justo), el escáner de nevera ("qué cocino con lo que ya
   tengo"), y — futuro — el modo batch cooking de HOJA-DE-RUTA (detectar recetas repetidas
   y proponer cocinarlas juntas) empujan todos en esa dirección.

## Decisiones técnicas

| Tema | Decisión | Por qué |
|---|---|---|
| Framework | **Expo (React Native) + TypeScript, expo-router** | Mismo lenguaje/ecosistema que la web; reutilización directa de la lógica de dominio pura (types, serving-utils, shopping-list-utils, ingredientKey…); un solo código para iOS+Android; dev loop con Expo Go en el móvil del usuario (Windows, sin Mac). |
| Ubicación | Carpeta **`native/`** dentro de este repo | Un solo repo que ya conocemos; App Hosting construye la web desde la raíz y no toca la subcarpeta. Extraer un paquete compartido `shared/` solo si el copy-paste de lib empieza a doler. |
| Backend | **El mismo proyecto Firebase** (Auth + Firestore + Storage) | Los datos ya son compartidos: el usuario entra con su misma cuenta y ve su mismo plan/recetas/entrevista. Cero migración. |
| SDK Firebase | **SDK JS (el mismo `firebase` de la web)**, no react-native-firebase | Funciona en Expo managed sin prebuild; mismos patrones de código que la web. ⚠️ Limitación conocida: Firestore en RN con SDK JS **no tiene persistencia offline en disco** (solo caché en memoria de la sesión). Si la lista de la compra sin cobertura en el súper se vuelve un problema real, reevaluar react-native-firebase (necesita dev build, sigue siendo compatible con Expo). |
| Auth | Fase 1: **email/contraseña** (funciona directo con el SDK JS). Google Sign-In después vía `expo-auth-session` (necesita OAuth client IDs iOS/Android en la consola). | No bloquear la fase 1 con la burocracia de OAuth. |
| IA (Gemini) | La app nativa **NO llama a Gemini directamente**. Se añade en la web una capa fina `/api/ai/*` (route handlers Next) que: verifica el ID token de Firebase → aplica la cuota (`ai-rate-limit`) → invoca el MISMO flow Genkit de siempre. | La clave Gemini nunca sale del servidor; los flows y sus prompts (incl. la entrevista vía `prompt-fragments.ts`) se mantienen en un solo sitio. Trabajo del lado web, fase 3. |
| Lógica compartida | Copiar a `native/src/lib/` los módulos puros: `types.ts`, `constants.ts`, `utils.ts` (ingredientKey, pluralizeUnit), `serving-utils.ts`, `shopping-list-utils.ts`, `ingredient-similarity.ts` | Son TS puro sin dependencias de Next/DOM. Copia con cabecera "// copiado de src/lib/X — mantener en sincronía" hasta que haya paquete compartido. |
| Tema visual | Tokens sacados del boceto v2: terracota `#D9531F`, crema `#F7F3EC` / superficie `#FFFDF9`, salvia `#7E9A6B` (solo dieta/IA/avisos suaves), tinta `#3A2414` / `#8A6A4A`, líneas `#E2D8C7`. Macros: P salvia · C ocre `#C99A3E` · G terracota. Títulos y números grandes en **serif** (Georgia-like), UI en sans. Un solo botón primario terracota por pantalla. | Es la identidad ya validada en los bocetos y coherente con la web. |

## Mapa de pantallas (bocetos → app, con la filosofía aplicada)

Tab bar de 5: **Plan · Recetas · [IA central elevado] · Compra · Perfil**.

| # boceto | Pantalla | Ajustes sobre el boceto |
|---|---|---|
| 1 | Plan → Hoy | Anillo + 3 barras como héroe, franjas del día con "+ Añadir…", check "me lo comí". Copy de "seguir el plan", nunca de "registrar". |
| 2 | Plan → Semana (cuadrante) | Sin cambios: cuadrícula días×comidas, hoy resaltado, descargar PDF apaisado, atajo a compra, autocompletar (salvia). **Es el corazón de la app.** |
| 3 | Añadir comida | Sin cambios: buscador, chips, ordenar por macros, "pedir receta a la IA". Sin escáner de código aquí. |
| 4 | Asistente IA | Sin dictado por voz de inicio (retirado en la web 2026-07-19 por fiabilidad; en nativo se puede retomar con la API nativa de speech, MUCHO más fiable que Web Speech — reevaluar en fase 4). Chat + chips de acción + foto de nevera. |
| 5 | Editor receta/alimento | Sin cambios: marca aparte, toggle g/piezas, aviso anti-duplicado. |
| 6 | Biblioteca | Sin cambios: Mis recetas / Recetas Nutrilp, filtros tras botón, ordenar. |
| 7 | Modo cocina | Sin cambios: raciones a preparar escala cantidades, pasos, temporizadores. |
| 8 | Compra | Sin cambios: generada del plan escalada a raciones, por pasillos, manual. |
| 9 | Perfil | **Progreso fuera** (ver norte §3). Pestañas: **Objetivos** (calculadora + dieta) · **Entrevista** (los bocetos son del 14-jul, anteriores a "La entrevista" del 15-jul — se añade aquí, mismo wizard de 8 pasos) · **Historial** (semanas guardadas). |
| — | Onboarding | Los bocetos no lo cubren: tour de Chefie adaptado a móvil (la mascota ya existe como SVG) + entrevista como parte del alta. Fase 4. El Librito también entra aquí (contenido ya escrito, es una pantalla de lectura). |

## Roadmap por fases

- **F0 — Cimientos** ← EN CURSO
  Scaffold Expo + TS + expo-router. Tema (tokens del boceto). Tab bar de 5 con IA central
  elevado. Pantallas stub. Lib de dominio copiada. Typecheck limpio.
- **F1 — Leer (la app ya sirve para consultar tu plan)**
  Firebase Auth (email/contraseña) + Firestore. Hoy + Semana en tiempo real desde
  `users/{uid}/weekPlan`. Biblioteca (propias + globales) con filtros. Vista de receta.
- **F2 — Organizar (el corazón)**
  Editar el plan (añadir desde la franja, mover, quitar, raciones ±). Marcar "comido".
  Lista de la compra (generar del plan + manual + tachar). Historial (guardar/restaurar).
  Objetivos (calculadora) + Entrevista en Perfil.
- **F3 — IA**
  Lado web: endpoints `/api/ai/*` autenticados (autocomplete, assistant, generate-recipe,
  parse-fridge) reusando los flows. Lado nativo: asistente con chips de acción,
  autocompletar semana, pedir receta, foto de nevera (cámara nativa).
- **F4 — Nativo de verdad**
  Descargar cuadrante en PDF. **Recibir "Compartir" desde Instagram/TikTok** (share
  intent nativo — funciona en iOS Y Android, mejor que el share_target de la PWA).
  Escáner de código de barras con cámara nativa. Modo cocina con temporizadores +
  mantener pantalla encendida. Onboarding con Chefie + Librito. Reevaluar voz (speech nativo).
- **F5 — Stores**
  Iconos/splash definitivos, EAS Build, TestFlight + Play interno, ficha de tienda.

## Estado

- 2026-07-23 — F0: plan escrito, scaffold + tema + tab bar + stubs. ✅
- 2026-07-24 — F1: login (email/contraseña, mismo Firebase) + lectura en vivo de plan
  (Hoy/Semana), recetas (biblioteca + detalle), compra y perfil. Typecheck limpio,
  verificado en Expo web hasta el camino de error del login (backend real). Pendiente:
  confirmación del usuario con su cuenta. Ver `.flow/DECISIONS.md` 2026-07-24.
- 2026-07-24 — F2 (núcleo): editar plan (añadir/quitar/raciones), compra completa,
  historial, y marcar "comido" (contrato del diario replicado de la web; anillo =
  kcal restantes). Pospuesto: calculadora y entrevista editables en la app.
  Ver `.flow/DECISIONS.md` 2026-07-24 (F2 y comido).
- 2026-07-24 — F3 (núcleo): endpoints web `/api/ai/*` autenticados (reusan flows) +
  Asistente en la app (chat, ejecuta acciones cliente, autocompletar inline).
  Pendiente F3: create_recipe + foto de nevera (con F4, necesitan pantalla de
  revisión y cámara). Ver `.flow/DECISIONS.md` 2026-07-24 (F3).
- 2026-07-24 — F4 (1ª tanda, todo Expo-Go-compatible): PDF del cuadrante, modo
  cocina (temporizadores + keep-awake + TTS) y El Librito.
- 2026-07-24 — F4 (2ª tanda): crear receta con IA end-to-end (revisión + guardado
  + alta de alimentos nuevos en el catálogo) y escáner de código de barras
  (OFF → producto de 1 ración).
- 2026-07-24 — F4 (3ª tanda): foto de nevera (endpoint parse-fridge + pantalla) y
  onboarding con Chefie (mascota en react-native-svg + saludo de primera vez).
  **Pendiente F4**: editor manual de recetas; y con dev build: share intent de
  IG/TikTok y voz nativa. Ver `.flow/DECISIONS.md` 2026-07-24 (F4, tres entradas).
- 2026-07-24 — F5: preparación de builds (iconos de marca, app.json completo,
  eas.json con 3 perfiles, limpieza de plantilla). Verificado con expo-doctor
  20/20 y `expo export` del bundle de producción. **Continúa el usuario desde
  `.claude/LANZAMIENTO-APP-NATIVA.md`** (cuentas, builds, tiendas, y los dos
  bloqueantes de tienda: política de privacidad y borrado de cuenta in-app).
