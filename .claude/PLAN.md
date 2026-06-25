# Nutrilp — Plan de acción (rediseño móvil acotado, voice-first)

> Fecha: 2026-06-25.
> Planes anteriores (completados) archivados en `.claude/PLAN-*.md`.
> Relacionado: [`LANZAMIENTO-ALFA.md`](./LANZAMIENTO-ALFA.md), [`HOJA-DE-RUTA.md`](./HOJA-DE-RUTA.md).

## Contexto

El móvil va a ser **la forma principal de uso** (cocina, supermercado), con la **voz como
protagonista**: el usuario habla para cambiar comidas ("cámbiame la cena del martes a pollo").
Se rediseña el móvil para que sea cómodo y bonito, **día a día deslizable** (la semana completa
no cabe en un móvil). Trabajo **por bloques**, auditando cada uno (`tsc`, `lint` donde toque)
antes de continuar.

**Lo que YA existe (no se rehace de cero):**
- `/` redirige por tamaño: ≤768px → `/mobile`, escritorio → `/dashboard`.
- `/mobile` con layout propio: `PageHeader` arriba + bottom-nav (Plan / Recetas / Compra).
- Planificador **día a día con flechas** (`mobile-page-content.tsx`): tarjetas de comida, tocar
  comida → selector de recetas, tocar receta → ficha, X para quitar.
- Pestañas `/mobile/recipes` y `/mobile/shopping-list`.
- **El asistente ya está cableado por completo en `/mobile/recipes`** (drop, clear, autocomplete,
  setGoal, crear receta) — patrón reutilizable.

**Problemas a resolver:** no se ve bien / poco usable; el **asistente de voz no está en el
planificador** (su sitio natural); los estados vacíos mandan "a la versión de escritorio";
faltan controles de ración y resumen diario; no hay gesto de deslizar.

**Principios:** no tocar el escritorio (`/dashboard`); PWA, **sin app nativa** (eso es post-alfa);
reutilizar diálogos compartidos ya mejorados (selector con categorías + filtro de dieta, modo
cocina, ficha de receta con confirmación de borrado en línea).

---

## Bloque 1 — Planificador día a día: usable y bonito (pantalla principal)

**Objetivo:** que `/mobile` se pueda usar de principio a fin sin pisar nunca el escritorio.

**Archivo:** `src/components/nutri-planner/mobile-page-content.tsx` (+ helpers compartidos de
escalado de raciones / totales si conviene extraerlos).

### 1.1 — Cabecera de día con contexto y navegación
- Mostrar "Hoy / Mañana / Ayer" + fecha legible; flechas ← →.
- **Gesto de deslizar** (swipe táctil) izquierda/derecha para cambiar de día, además de las flechas.

### 1.2 — Tarjetas de comida y control de raciones
- Rediseño visual de las tarjetas (legibles, con jerarquía clara).
- Por receta: control de **raciones (+/−)** y **kcal escaladas**, igual que en escritorio
  (reutilizar la lógica de porciones de `meal-planner`/`MealRecipeChip`).

### 1.3 — Resumen diario
- Bloque compacto arriba con **calorías/macros del día vs objetivo** (anillo o barras).

### 1.4 — Estados vacíos accionables
- Quitar el mensaje "añádelas desde la versión de escritorio".
- Permitir **añadir comidas y recetas desde el móvil**: tocar un slot → selector (ya con
  categorías + filtro de dieta); si el día no tiene comidas, ofrecer crearlas/sembrarlas.

**Auditoría B1:** `tsc` 0. Manual (preview ~390px): navegar días con flechas y swipe; añadir y
quitar recetas; ver raciones/kcal y el resumen del día; estados vacíos accionables.

---

## Bloque 2 — Asistente de voz omnipresente (feature estrella)

**Objetivo:** poder hablarle desde el planificador para cambiar comidas en cualquier momento.

**Archivos:** `src/app/mobile/page.tsx` / `mobile-page-content.tsx`, y un **hook/wrapper
compartido** nuevo (p. ej. `useMobileAssistant`) que extraiga el wiring que hoy está duplicado
en `/mobile/recipes/page.tsx`.

### 2.1 — Montar el asistente en el planificador con wiring completo
- Reutilizar el patrón de `/mobile/recipes` (useRecipeState + useWeekPlanState +
  useUserProfileState + `handleAutocomplete` local) para dar al `AssistantDialog` todos los
  handlers (onDrop, onClearMeal, onClearDay, onClearWeek, onAutocomplete, onSetGoal,
  onCreateRecipe). Extraerlo a un hook compartido para no duplicar.

### 2.2 — Botón flotante de micro/asistente (FAB)
- FAB prominente y persistente en el planificador que **abre el asistente directamente listo para
  hablar**. Un toque → hablar → "cámbiame la cena del martes a pollo".
- Respetar la preferencia de voz (on/off ya persistida) y el micro ya arreglado (Chrome/Edge;
  Opera degrada con toast).

**Auditoría B2:** `tsc` 0. Manual (Chrome móvil/responsive): abrir el FAB desde el planificador,
dictar una orden de cambio de comida y ver que el plan se actualiza; respuesta hablada si la voz
está activada.

---

## Bloque 3 — Cabecera, objetivos y pantallas secundarias

**Objetivo:** que el resto del móvil acompañe, sin rehacerlo entero.

**Archivos:** `src/components/layout/page-header.tsx` (variante móvil),
`mobile-recipes-page-content.tsx`, `src/app/mobile/shopping-list/*`, `mobile-nav.tsx`.

- **Cabecera móvil**: logo Nutrilp + perfil/menú compacto; acceso a **Objetivos** (calculadora)
  desde el móvil (icono en cabecera u overflow), hoy no accesible.
- **Pulir Recetas** (grid/list, FAB de nueva receta ya existe) y **Compra** (lista) para móvil.
- Revisar bottom-nav: mantener Plan/Recetas/Compra; el asistente va por FAB (más a mano), no en la
  barra.

**Auditoría B3:** `tsc` 0 · `lint` 0. Manual: Objetivos accesible desde móvil; Recetas y Compra
se ven bien a ~390px.

---

## Fuera de alcance

- App nativa (post-alfa; ver `LANZAMIENTO-ALFA.md`).
- Tocar el escritorio `/dashboard`.
- Funcionalidades de `HOJA-DE-RUTA.md` (código de barras, historial, etc.).

---

## Verificación final

1. `npm run dev`, abrir en responsive ~390px (y en el móvil real vía red local si se puede).
2. Planificador: días con flechas + swipe, añadir/quitar/raciones, resumen diario, estados vacíos.
3. Voz: FAB → dictar cambio de comida → el plan se actualiza; respuesta hablada.
4. Objetivos accesible; Recetas y Compra correctas en móvil.
5. Escritorio intacto.
6. `npm run lint` y `npm run build` en verde.

---

## Progreso

- [x] Bloque 1 — Planificador día a día usable y bonito · `tsc` 0
- [x] Bloque 2 — Asistente de voz omnipresente (FAB + wiring) · `tsc` 0
- [x] Bloque 3 — Cabecera, objetivos y pantallas secundarias · `tsc` 0 · `lint` 0
- [x] Verificación final · `lint` 0 · `build` OK (17 rutas, incl. /mobile/objetivos)

> Pendiente: pruebas manuales en el móvil real con sesión iniciada (planificador, swipe,
> raciones, FAB de voz, objetivos) — no automatizables desde aquí.
