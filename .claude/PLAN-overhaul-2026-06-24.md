# Plan maestro — NutriPlanner "versión definitiva"

Plan por **bloques**; cada bloque tiene **STEPs** con su checklist de auditoría.
Patrón de ejecución (igual que los planes anteriores): implementar el STEP → ejecutar
su AUDIT (incluido `npx tsc --noEmit` exit 0 y `npx next lint` 0 warnings) → arreglar →
imprimir `✓ STEP X.Y AUDIT: PASS`. No avanzar hasta que el STEP actual pase. Al cerrar
un bloque, build de producción limpio antes de pasar al siguiente.

---

## Decisiones de diseño asumidas (VALIDAR antes de empezar — corrige lo que no encaje)

1. **Recetario base = se reutiliza la colección global existente** (`nutriplanner_recipes`)
   como un **recetario de solo lectura** que viene con la app. Deja de ser "lo que el admin
   comparte en vivo" y pasa a ser un *seed*. El admin conserva la capacidad de poblarlo
   (necesaria para meter las recetas al final). La pestaña "NutriPlanner" se renombra a
   **"Recetario"**. Se elimina toda la UI de "compartir" del lado usuario.
2. **Carpetas: eliminación total** (usuario y globales). No hay usuarios reales, así que NO
   se migra: las recetas dejan de tener `folderId` y la biblioteca se organiza solo por
   **categorías** (las cestas inteligentes ya existentes). Las que no tengan categoría caen
   en la cesta "Otros".
3. **Ajuste de cantidad por objetivo individual (el caso "mi pareja pesa 20 kg menos"):**
   cada usuario tiene su cuenta y su objetivo (ya es así). Comparten el mismo recetario base,
   pero la app les marca **cantidades distintas** de la misma receta. NO se reescribe la receta:
   guarda macros **por ración**, y a cada usuario se le calcula automáticamente **cuántas
   raciones / qué porción** comer = `targetCalories_del_slot / caloriesPorRación`, derivado de
   SU objetivo. Esto es **funcionalidad central del Bloque 4** (STEP 4.5), no queda fuera.
   Lo único fuera de alcance es meter **varias personas en UNA misma cuenta** (eso sí sería
   rehacer el modelo del plan a por-persona; no es lo que se pide).
4. **App nativa: fuera de alcance** de este plan. Primero PWA (Bloque 3); la nativa se aborda
   como proyecto aparte después.
5. **Control por voz:** se construye primero el **catálogo de acciones** (Bloque 5), que da
   valor inmediato al chat de texto, y la **capa de voz** (Bloque 6) se monta encima. La voz
   usa Web Speech API (navegador/PWA) en v1.
6. **Contenido de recetas (crear las X recetas con macros reales):** trabajo de datos, se hace
   AL FINAL una vez todo está programado (Bloque 8, no es código).

---

# BLOQUE 1 — Limpieza del modelo de datos
**Objetivo:** quitar carpetas y "compartir", consolidar el modelo en torno a categorías,
y añadir etiquetas de dieta. Desbloquea todo lo demás.

## STEP 1.1 — Eliminar carpetas de usuario
**Archivos:** `recipe-library.tsx`, `recipe-dialog.tsx`, `use-recipe-state.ts`,
`use-dashboard.ts`, `dashboard/page.tsx`, `firestore-operations.ts`, `types.ts`,
`mobile-recipes-page-content.tsx`, `app/mobile/recipes/page.tsx`.
**Tarea:**
- Quitar `FolderSection`, `FolderButton`, `NewFolderPopover` y toda la UI de carpetas de la
  biblioteca. La barra lateral pasa a mostrar SOLO las cestas por categoría (ya existen).
- Eliminar props/handlers: `onFolderCreate/Update/Delete`, `onAssignRecipeToFolder`, estado
  `selectedFolderId`, `editingFolderId`, etc. Sustituir el filtro por carpeta por el filtro
  por categoría/cesta.
- Quitar el campo "Carpeta" del formulario de receta (`recipe-dialog.tsx`).
- Quitar `folderId` de `RecipeSchema` y de los tipos. Quitar `Folder` interface.
- Limpiar `firestore-operations.ts`: `deleteFolderAndUnlinkRecipes`, asignaciones, refs a
  `folders`.

**AUDIT:**
- [ ] La biblioteca ya no muestra carpetas; se navega por categorías
- [ ] Crear/editar receta ya no tiene selector de carpeta y guarda sin `folderId`
- [ ] No quedan imports/refs muertas a folders (grep `folderId|Folder\b` limpio salvo dietas)
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 1.1 AUDIT: PASS`

## STEP 1.2 — Eliminar carpetas globales y renombrar "NutriPlanner" → "Recetario"
**Archivos:** `recipe-library.tsx`, `use-recipe-state.ts`, `use-dashboard.ts`,
`firestore-operations.ts`, `admin/recipes/page.tsx`, `types.ts`.
**Tarea:**
- Eliminar `globalFolders`/`nutriplanner_folders` por completo (estado, handlers, UI, ops).
- Quitar `GlobalFolder` interface.
- Renombrar la pestaña "NutriPlanner" a **"Recetario"** en la biblioteca (texto/labels).
- La colección `nutriplanner_recipes` se mantiene como recetario base (solo lectura para
  usuarios; el admin la gestiona).

**AUDIT:**
- [ ] No quedan refs a carpetas globales
- [ ] La pestaña se llama "Recetario" y lista las recetas base
- [ ] Las recetas base siguen visibles y copiables a "Mis Recetas"
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 1.2 AUDIT: PASS`

## STEP 1.3 — Retirar la función de "compartir" del admin
**Archivos:** `recipe-dialog.tsx`, `actions.ts`, `meal-planner.tsx` (export imagen),
`admin/recipes/page.tsx`.
**Tarea:**
- Revisar el flujo `saveAsGlobal`/`isGlobal`: conservar SOLO el camino admin→recetario base
  (poblar el seed). Quitar de la UI de usuario cualquier toggle de "guardar como global/
  compartir".
- Mantener `verifyAdmin` en las acciones que escriben el recetario base (seguridad intacta,
  ver [[admin-security-model]]).
- Decidir sobre el botón de **exportar plan a imagen** (`html2canvas` en `meal-planner.tsx`):
  si era parte de "compartir", evaluar si se mantiene como "descargar mi plan" (útil) o se
  quita. Por defecto: **mantener como descarga personal** (no es compartir entre usuarios).

**AUDIT:**
- [ ] Un usuario normal no puede crear recetas globales ni "compartir"
- [ ] El admin sí puede poblar el recetario base (con token, server-side)
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 1.3 AUDIT: PASS`

## STEP 1.4 — Etiquetas de dieta en la receta
**Archivos:** `constants.ts`, `types.ts`, `recipe-dialog.tsx`.
**Tarea:**
- Añadir `DIET_TAGS` en `constants.ts` (p. ej.: `omnivora`, `vegetariana`, `vegana`, `keto`,
  `low_carb`, `sin_gluten`, `sin_lactosa`) con etiquetas visibles. Tipo `DietTag` en `types.ts`.
- Añadir `dietTags?: DietTag[]` a `RecipeSchema` (multi, opcional; vacío = sin restricción).
- En el formulario de receta: control multi-selección de dietas (mismo patrón que categorías).
- Badges de dieta en la vista de receta.

**AUDIT:**
- [ ] Se pueden marcar varias dietas en una receta y se guardan
- [ ] Reabrir la receta muestra las dietas; vacío = sin restricción
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 1.4 AUDIT: PASS`

**CIERRE BLOQUE 1:** build de producción limpio. Imprimir `✓ BLOQUE 1 COMPLETO`.

---

# BLOQUE 2 — Onboarding contextual
**Objetivo:** sustituir el tour monolítico (520 líneas, 19 pasos) por una mini-guía inicial
+ tooltips contextuales la primera vez que se usa cada función, con "no volver a mostrar".

## STEP 2.1 — Infraestructura de "visto/no mostrar"
**Archivos:** `types.ts`, `use-user-profile-state.ts`.
**Tarea:**
- Añadir `onboardingFlags?: Record<string, boolean>` a `UserProfile` (clave = id de la guía,
  valor = ya visto/ocultar). Persistir en el perfil (Firestore) + caché en localStorage para
  respuesta inmediata.
- Helper `useOnboardingFlag(id)` → `{ shouldShow, dismiss, dismissForever }`.

**AUDIT:**
- [ ] El flag persiste por usuario y sobrevive recarga
- [ ] `dismissForever` evita que vuelva a aparecer
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 2.1 AUDIT: PASS`

## STEP 2.2 — Mini-guía de bienvenida
**Archivos:** nuevo `welcome-guide.tsx`, `dashboard/page.tsx`.
**Tarea:**
- Modal corto (3-4 pantallas máx.) que explica lo esencial: plan semanal, biblioteca/recetario,
  objetivos, asistente IA. Con "Empezar" y "No volver a mostrar".
- Se muestra solo si `onboardingFlags['welcome']` no está puesto.

**AUDIT:**
- [ ] Aparece solo la primera vez; "No volver a mostrar" lo desactiva
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 2.2 AUDIT: PASS`

## STEP 2.3 — Tooltips contextuales por funcionalidad
**Archivos:** nuevo `feature-hint.tsx`, puntos de uso (biblioteca, slots, objetivos, IA,
escáner nevera, importar URL).
**Tarea:**
- Componente `<FeatureHint id="..." title text>` que muestra un popover la primera vez que el
  usuario abre/usa esa función, con botón "Entendido" y "No volver a mostrar".
- Colocar hints en: añadir categoría a receta, tipo de comida de slot, autocompletar, objetivos,
  asistente IA, escáner de nevera, importar receta por URL.

**AUDIT:**
- [ ] Cada hint aparece una sola vez al usar su función por primera vez
- [ ] "No volver a mostrar" funciona individualmente por hint
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 2.3 AUDIT: PASS`

## STEP 2.4 — Retirar el tour monolítico
**Archivos:** `onboarding-tour.tsx` y sus invocaciones.
**Tarea:**
- Eliminar el tour viejo (o reducirlo a la mini-guía). Quitar imports/estados asociados.
- Opción en ajustes: "Volver a ver las guías" → resetea `onboardingFlags`.

**AUDIT:**
- [ ] El tour viejo ya no se dispara; no quedan refs muertas
- [ ] "Volver a ver las guías" resetea los flags
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 2.4 AUDIT: PASS`

**CIERRE BLOQUE 2:** build limpio. Imprimir `✓ BLOQUE 2 COMPLETO`.

---

# BLOQUE 3 — PWA (instalable)
**Objetivo:** convertir la web en PWA instalable y con caché básica. App nativa = aparte.

## STEP 3.1 — Manifest + iconos + metadatos
**Archivos:** `public/manifest.json`, `app/layout.tsx` (metadata), `public/icons`.
**Tarea:**
- Revisar/completar `manifest.json`: `name`, `short_name`, `start_url`, `display: standalone`,
  `theme_color`, `background_color`, `icons` (incluir 192 y 512, maskable).
- Enlazar manifest + theme-color desde el metadata de Next.

**AUDIT:**
- [ ] El manifest valida (sin campos faltantes) y se sirve correctamente
- [ ] `npx tsc --noEmit` exit 0
- Imprimir: `✓ STEP 3.1 AUDIT: PASS`

## STEP 3.2 — Service worker (offline básico)
**Archivos:** config PWA (Serwist/next-pwa) + `next.config.ts`.
**Tarea:**
- Integrar un service worker (recomendado **Serwist** por compatibilidad con Next 15/App
  Router) que cachee assets estáticos y dé fallback offline básico. Cuidar no romper el SSR
  ni las rutas dinámicas (`/api/*`).
- Asegurar que el SW no interfiera con Firebase ni con `.env`.

**AUDIT:**
- [ ] La app carga estando offline (al menos el shell) tras la primera visita
- [ ] No hay regresión en login/Firestore online
- [ ] `npx next build` sin errores (incluye generación del SW)
- Imprimir: `✓ STEP 3.2 AUDIT: PASS`

## STEP 3.3 — Prompt de instalación
**Archivos:** nuevo `install-prompt.tsx`.
**Tarea:**
- Capturar `beforeinstallprompt`, mostrar un CTA discreto "Instalar app" (con su flag de
  onboarding para no ser pesado). En iOS (sin prompt nativo) mostrar instrucción "Compartir →
  Añadir a pantalla de inicio".

**AUDIT:**
- [ ] En navegador compatible aparece el CTA y la instalación funciona
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 3.3 AUDIT: PASS`

## STEP 3.4 — Auditoría PWA
**Tarea:** Lighthouse PWA / instalabilidad.
**AUDIT:**
- [ ] Lighthouse marca la app como instalable, sin errores críticos de PWA
- [ ] Funciona en standalone (pantalla completa, sin barra del navegador)
- Imprimir: `✓ STEP 3.4 AUDIT: PASS`

**CIERRE BLOQUE 3:** Imprimir `✓ BLOQUE 3 COMPLETO`.

---

# BLOQUE 4 — Recetas base + IA con dietas (lógica)
**Objetivo:** que la dieta del usuario guíe a la IA y el filtrado. (El contenido de recetas
se mete en el Bloque 8.)

## STEP 4.1 — Preferencia de dieta en el perfil
**Archivos:** `types.ts`, `use-user-profile-state.ts`, UI de objetivos/ajustes.
**Tarea:**
- Añadir `dietPreference?: DietTag` (o varias) a `UserProfile`. Selector en objetivos/ajustes.

**AUDIT:**
- [ ] La preferencia se guarda y persiste
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 4.1 AUDIT: PASS`

## STEP 4.2 — Filtrado por dieta en el recetario/biblioteca
**Archivos:** `recipe-library.tsx`.
**Tarea:**
- Añadir filtro por etiqueta de dieta (pills) además de las categorías.
- Por defecto, respetar la `dietPreference` del usuario si está puesta.

**AUDIT:**
- [ ] Filtrar por dieta muestra solo recetas compatibles (o sin restricción)
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 4.2 AUDIT: PASS`

## STEP 4.3 — Dieta en el autocompletado IA
**Archivos:** `autocomplete-flow.ts`, `autocomplete-preferences-dialog.tsx`.
**Tarea:**
- Extender el pre-filtro determinista (el de categorías ya existente) para excluir recetas que
  NO cumplan la dieta seleccionada. Mismo patrón: filtrar `eligibleRecipeIds` por dieta, con
  fallback si el conjunto queda vacío.
- Pasar la dieta a las preferencias del diálogo de autocompletar.

**AUDIT:**
- [ ] Con dieta "vegana", la IA no asigna recetas no veganas
- [ ] Sin dieta, comportamiento actual sin cambios
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 4.3 AUDIT: PASS`

## STEP 4.4 — Dieta en el chat de recetas
**Archivos:** `recipe-chat-flow.ts`, `recipe-chat-dialog.tsx`.
**Tarea:**
- Inyectar la dieta del usuario en el prompt de generación, para que las recetas creadas por
  IA la respeten y se autoetiqueten con `dietTags`.

**AUDIT:**
- [ ] Pedir una receta con dieta activa genera algo compatible y etiquetado
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 4.4 AUDIT: PASS`

## STEP 4.5 — Escalado automático de cantidad por objetivo individual
**Archivos:** `autocomplete-flow.ts`, `use-week-plan-state.ts`, `meal-planner.tsx`,
`today-plan.tsx`, `nutrition-totals-tooltip.tsx`.
**Tarea:**
- Helper `suggestedServings(recipe, targetCalories)` = `targetCalories / (calories/servings)`,
  redondeado a un paso razonable (p. ej. 0,25 de ración), con mínimo > 0.
- **Autocompletado:** al asignar una receta a un slot, además de elegirla, fijar
  `servingsEaten` al valor sugerido para el objetivo de ESE usuario (no dejar 1 fijo).
- **Manual:** al soltar/añadir una receta del recetario base en un slot, auto-rellenar
  `servingsEaten` con la cantidad sugerida (el usuario puede ajustarla a mano después).
- **Presentación:** mostrar la porción ajustada del usuario ("tu porción: 1,5 raciones ≈ X g"
  o las kcal resultantes) en el slot, para que dos usuarios distintos vean cantidades distintas
  de la misma receta base.
- Recalcular sugerencia si cambia el objetivo del usuario (sin sobrescribir ajustes manuales ya
  hechos: solo aplica a nuevas asignaciones).

**AUDIT:**
- [ ] La misma receta base asignada a dos objetivos distintos marca raciones distintas
- [ ] El autocompletado fija raciones acordes al objetivo, no 1 fijo
- [ ] Añadir manualmente una receta auto-rellena la porción sugerida y se puede ajustar
- [ ] La porción mostrada refleja el objetivo individual del usuario
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 4.5 AUDIT: PASS`

**CIERRE BLOQUE 4:** build limpio. Imprimir `✓ BLOQUE 4 COMPLETO`.

---

# BLOQUE 5 — Catálogo de acciones (base para chat de texto y voz)
**Objetivo:** exponer las operaciones de la app como "herramientas" tipadas que la IA puede
invocar (function-calling). Sirve para el chat de texto YA, y para la voz en el Bloque 6.

## STEP 5.1 — Definir el catálogo de acciones
**Archivos:** nuevo `src/ai/actions/registry.ts` (+ tipos).
**Tarea:**
- Definir un conjunto de acciones tipadas con Zod (nombre, descripción, input schema, handler):
  crear/editar/borrar receta, añadir/quitar receta de un slot, mover/intercambiar recetas entre
  slots, crear/editar slot, editar objetivo, añadir alimento (ingrediente base), limpiar día/
  semana, etc. Cada acción declara si es **destructiva**.

**AUDIT:**
- [ ] Cada acción tiene schema Zod válido y handler tipado
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 5.1 AUDIT: PASS`

## STEP 5.2 — Capa de ejecución segura
**Archivos:** `registry.ts`, nuevo `action-executor`.
**Tarea:**
- Ejecutor que valida input, comprueba permisos y, para acciones **destructivas**, exige
  confirmación explícita del usuario antes de aplicar.

**AUDIT:**
- [ ] Una acción destructiva no se aplica sin confirmación
- [ ] Input inválido se rechaza con mensaje claro
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 5.2 AUDIT: PASS`

## STEP 5.3 — Conectar el chat de texto al catálogo
**Archivos:** `recipe-chat-flow.ts` (o nuevo `assistant-flow.ts`), `recipe-chat-dialog.tsx`.
**Tarea:**
- Migrar/añadir function-calling: el modelo recibe el catálogo como tools y decide qué invocar.
  El diálogo muestra la propuesta de acción y pide confirmación para las destructivas.

**AUDIT:**
- [ ] "Añade [receta] al almuerzo del martes" por texto ejecuta la acción correcta
- [ ] "Borra el lunes" pide confirmación antes de aplicar
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 5.3 AUDIT: PASS`

## STEP 5.4 — Pruebas del flujo por texto
**Tarea:** batería de comandos (crear, editar, mover, borrar, añadir alimento, editar plan).
**AUDIT:**
- [ ] Los comandos del catálogo funcionan end-to-end por texto
- [ ] `npx next build` sin errores
- Imprimir: `✓ STEP 5.4 AUDIT: PASS`

**CIERRE BLOQUE 5:** Imprimir `✓ BLOQUE 5 COMPLETO`.

---

# BLOQUE 6 — Control por voz
**Objetivo:** manejar la app por voz, encima del catálogo del Bloque 5.

## STEP 6.1 — Captura de voz (STT)
**Archivos:** nuevo `use-speech-recognition.ts`, UI del asistente.
**Tarea:**
- Integrar Web Speech API (reconocimiento) con manejo de permisos de micrófono, estados
  (escuchando/procesando) y fallback si el navegador no lo soporta.

**AUDIT:**
- [ ] Dictar un comando produce el texto correcto y lo envía al asistente
- [ ] Manejo correcto de permiso denegado / no soportado
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 6.1 AUDIT: PASS`

## STEP 6.2 — Respuesta hablada (TTS)
**Archivos:** `use-speech-synthesis.ts`, UI del asistente.
**Tarea:**
- Leer en voz la confirmación/resultado de la acción. Toggle para silenciar.

**AUDIT:**
- [ ] La respuesta del asistente se reproduce por voz; se puede silenciar
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 6.2 AUDIT: PASS`

## STEP 6.3 — Bucle conversacional por voz
**Archivos:** UI del asistente de voz.
**Tarea:**
- Flujo completo: hablar → texto → catálogo de acciones → confirmación (hablada para
  destructivas) → ejecutar → respuesta hablada. Modo "manos libres" opcional.

**AUDIT:**
- [ ] "Cambia la cena del jueves por [receta]" por voz funciona con confirmación
- [ ] Las acciones destructivas piden confirmación también por voz
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 6.3 AUDIT: PASS`

## STEP 6.4 — Pruebas end-to-end por voz
**AUDIT:**
- [ ] Batería de comandos por voz cubre crear/editar/mover/borrar/plan/alimentos
- [ ] `npx next build` sin errores
- Imprimir: `✓ STEP 6.4 AUDIT: PASS`

**CIERRE BLOQUE 6:** Imprimir `✓ BLOQUE 6 COMPLETO`.

---

# BLOQUE 7 — Pulido final de menús y layout
**Objetivo:** (al final, como se pidió) revisar encuadre, scroll y overflow con todos los
cambios ya integrados.

## STEP 7.1 — Inventario de problemas
**Tarea:** recorrer cada vista (dashboard, biblioteca/recetario, plan, objetivos, lista de
compra, asistente, PWA en móvil) y listar problemas concretos de encuadre/scroll/overflow.
**AUDIT:**
- [ ] Lista de problemas documentada por pantalla
- Imprimir: `✓ STEP 7.1 AUDIT: PASS`

## STEP 7.2 — Correcciones
**Tarea:** arreglar overflow, contenedores sin scroll, elementos cortados, en desktop y móvil/PWA.
**AUDIT:**
- [ ] Cada problema del inventario corregido
- [ ] Sin scroll horizontal indeseado; todo accesible
- [ ] `npx tsc --noEmit` exit 0 · `npx next lint` 0 warnings
- Imprimir: `✓ STEP 7.2 AUDIT: PASS`

## STEP 7.3 — Auditoría visual responsive
**AUDIT:**
- [ ] Revisado en anchos clave (móvil, tablet, desktop) y en PWA standalone
- [ ] `npx next build` limpio
- Imprimir: `✓ STEP 7.3 AUDIT: PASS`

**CIERRE BLOQUE 7:** Imprimir `✓ BLOQUE 7 COMPLETO`.

---

# BLOQUE 8 — Contenido: recetas base con macros reales (NO código)
**Objetivo:** poblar el recetario base con un número X de recetas reales, etiquetadas por
categoría y dieta, una vez todo está programado. Es trabajo de datos/curación.
- Definir cuántas recetas y qué dietas cubrir.
- Cargarlas (vía panel admin) con macros, categorías y `dietTags`.
- Verificar que el autocompletado y los filtros funcionan con datos reales.

---

## Fuera de alcance de este plan (futuro)
- **App nativa** (Capacitor/React Native) — proyecto aparte tras la PWA.
- **Varias personas en UNA misma cuenta** (un único plan que sirva raciones distintas a dos
  comensales a la vez) — requiere modelar el plan por-persona; posible v2. NOTA: el caso
  habitual (cada persona en su cuenta, con su objetivo y su porción ajustada) SÍ está cubierto
  por el STEP 4.5.
