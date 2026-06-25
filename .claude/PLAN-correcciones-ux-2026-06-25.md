# Nutrilp — Plan de acción (correcciones UX + filtro por dieta)

> Fecha: 2026-06-25.
> Planes anteriores (completados) archivados en `.claude/PLAN-*.md`.
> Backlog a futuro en [`HOJA-DE-RUTA.md`](./HOJA-DE-RUTA.md).

## Contexto

Ronda de **correcciones de errores** detectados al probar la app, más una **mejora**
(filtro por dieta al añadir a un slot, que el usuario ya validó). Se trabaja **por bloques**,
implementando y auditando cada uno (`tsc --noEmit`, y `lint` donde toque) **antes de pasar al
siguiente**. La IA sigue con Genkit + Gemini; no cambia el proveedor. Se mantiene el principio
de marca: solo texto visible "Nutrilp", internals intactos.

**Diagnóstico ya hecho (causas raíz identificadas):**
- *Doble X en modo cocina*: `DialogContent` base ya pinta su propia X y
  `cooking-mode-dialog.tsx` pinta otra encima.
- *Click en receta del plan abre dos ventanas*: `MealRecipeChip` (en `meal-planner.tsx`) no
  hace `stopPropagation`, así que el click llega también al `onClick` del slot.
- *Selector de voz y selector de nivel de actividad rotos*: ambos son `Select` de Radix dentro
  de un `Dialog` → causa raíz probablemente compartida (focus trap / pointer events del portal).
- *Pasos IA no separados en modo cocina*: el split es solo por `\n`; el modelo a veces devuelve
  un bloque único o numeración en línea ("1. … 2. …").

---

## Bloque 1 — Modo cocina (4 arreglos)

**Archivo:** `src/components/nutri-planner/cooking-mode-dialog.tsx`
(+ posible helper nuevo `src/lib/recipe-steps.ts`).

### 1.1 — Una sola X para cerrar
- Pasar `hideCloseButton` al `DialogContent` del modo cocina (el componente ya soporta esa prop
  en `ui/dialog.tsx`), conservando el botón grande de cierre propio del modo cocina.

### 1.2 — Checkboxes / pasos que no se marcan
- Causa probable: el `useEffect` del Wake Lock tiene `requestWakeLock`/`releaseWakeLock` en sus
  dependencias; `releaseWakeLock` depende de `wakeLock`, que cambia justo al abrir → el efecto
  se vuelve a ejecutar y **resetea** `completedSteps`/`checkedIngredients` (posible bucle
  `setWakeLock` → re-run).
- Reestructurar: guardar el lock en un `ref` (no en estado que dispare el efecto) o separar el
  reset del estado (solo en la transición real de cierre→apertura) del ciclo del Wake Lock.
- Verificar que marcar ingrediente y marcar paso persisten y no se borran solos.

### 1.3 — Separar los pasos correctamente (también recetas de la IA)
- Crear `splitInstructionSteps(instructions: string): string[]`: divide por `\n`; si sale un
  único bloque, intenta dividir por marcadores numerados ("1. ", "2) "…) y, en último recurso,
  por frases. Quitar numeración previa para el checklist.
- Usarlo en el modo cocina (y reutilizable desde la vista de receta si hiciera falta).

### 1.4 — Mostrar la URL del vídeo/fuente en el modo cocina
- Si `recipe.sourceUrl` existe, mostrar un enlace clicable ("Ver vídeo / receta original",
  `target="_blank" rel="noopener noreferrer"`) en la cabecera o al inicio del contenido.

**Auditoría B1:** `tsc --noEmit` = 0. Manual: abrir modo cocina → una sola X; marcar pasos e
ingredientes funciona y persiste; receta de la IA sale en pasos separados; el enlace de fuente
aparece y abre en pestaña nueva.

---

## Bloque 2 — Click en receta del plan no debe abrir el selector del slot

**Archivo:** `src/components/nutri-planner/meal-planner.tsx`.

- En `MealRecipeChip`, el `onClick` del contenedor principal (línea ~150) debe hacer
  `e.stopPropagation()` antes de `onRecipeClick(recipe)`, para que el click no burbujee al
  `handleSlotClick` del `MealSlot` (que abre el diálogo de añadir receta).
- Comprobar que clicar el chip abre **solo** la vista de receta, y que clicar en zona vacía del
  slot sigue abriendo el selector de añadir.

**Auditoría B2:** `tsc --noEmit` = 0. Manual: clic en receta del plan → solo se abre su ficha;
clic en hueco vacío del slot → solo se abre "Añadir a …".

---

## Bloque 3 — Selección de recetas en el slot: plegables + filtro por dieta

**Archivo:** `src/components/nutri-planner/recipe-selection-dialog.tsx`
(+ `dashboard/page.tsx` para pasar `dietPreference`).

### 3.1 — Categorías plegables / navegables (no toda la lista a la vez)
- Hoy se renderizan todas las categorías expandidas; con muchas recetas hay scroll infinito.
- Convertir cada categoría en un **acordeón** (usar `ui/accordion`, Radix ya instalado) o añadir
  una **barra de chips de categoría** que filtre la lista. Mantener buscador y multiselección.
- Decisión de diseño a fijar al implementar: acordeón (colapsado por defecto, abre la categoría
  buscada) vs. chips de filtro. Recomendado: **chips de filtro de categoría + buscador**, que es
  lo más rápido con 100+ recetas.

### 3.2 — Filtro por dieta (mejora validada por el usuario)
- Pasar `dietPreference` (de `currentDietPreference` en el dashboard) al diálogo.
- Filtrar las recetas que cumplen la dieta activa, con un **toggle "ver todas"** para no ocultar
  recetas sin `dietTags`. Recetas sin tags se tratan como compatibles (comodín) salvo decisión
  contraria.

**Auditoría B3:** `tsc --noEmit` = 0 · `lint` = 0. Manual: con muchas recetas, llegar a "Cenas"
sin scroll largo; el filtro de dieta reduce la lista y el toggle restaura todas.

---

## Bloque 4 — Selectores Radix dentro de Dialog (voz + nivel de actividad)

**Archivos:** `src/components/nutri-planner/calculator-dialog.tsx`,
`src/components/nutri-planner/assistant-dialog.tsx` (y, si la causa es transversal,
`src/components/ui/select.tsx`).

- Reproducir y diagnosticar por qué un `Select` de Radix no responde dentro de un `Dialog`
  (sospechas: focus trap del Dialog, `pointer-events`, o el portal del `SelectContent`
  renderizando detrás del overlay; típico en móvil/touch).
- Arreglo probable y de bajo riesgo: dar al `SelectContent` el `position`/`z-index` correcto, o
  envolver el portal adecuadamente, o evitar que el Dialog capture el pointer del Select. Si la
  causa es común, corregir una vez en `ui/select.tsx` y validar en ambos sitios.
- **4.1** Calculadora: poder cambiar "Nivel de Actividad" y que recalcule.
- **4.2** Asistente: el desplegable de voz cambia la voz y se oye con la voz elegida.

**Auditoría B4:** `tsc --noEmit` = 0. Manual: en la calculadora se cambia el nivel de actividad
y el resultado cambia; en el asistente se elige otra voz y la respuesta hablada usa esa voz.

---

## Bloque 5 — Dictado por voz (micrófono no transcribe)

**Archivos:** `src/hooks/use-speech-recognition.ts`,
`src/components/nutri-planner/assistant-dialog.tsx`.

- Síntoma: pide permiso pero al hablar no transcribe nada (`onresult` no llega o se aborta).
- Diagnosticar sospechas:
  - El `getUserMedia` pide permiso y **libera el stream** justo antes de `rec.start()`; en
    algún navegador esa carrera deja a `SpeechRecognition` sin captar audio.
  - El efecto que crea la instancia depende de `reportError`/`opts.lang`; si se recrea, el
    `cleanup` hace `rec.abort()` y mata el reconocimiento en marcha.
  - `interimResults`/`continuous` y el manejo de `onend` (no-speech) demasiado agresivo.
- Arreglar según diagnóstico (probable: no liberar el mic antes de empezar, estabilizar el efecto
  y/o usar `interimResults` para feedback). Asegurar `onResult` → envía el texto al chat.

**Auditoría B5:** `tsc --noEmit` = 0. Manual (Chrome/Edge): tocar micro, hablar → el texto
aparece y se envía; un error de permiso muestra el toast correcto.

---

## Fuera de alcance (en HOJA-DE-RUTA.md)

Escaneo de código de barras, importar receta por texto, compartir receta, iconos/logo PWA de
Nutrilp, dominio/hosting, historial semanal, progreso de macros. No se tocan en este plan.

---

## Verificación final (end-to-end)

1. `npm run dev` y abrir la app.
2. **Modo cocina:** una sola X · marcar pasos/ingredientes funciona · receta IA en pasos ·
   enlace de fuente visible.
3. **Plan:** clic en receta → solo ficha; clic en hueco → solo "Añadir".
4. **Slot:** categorías navegables sin scroll infinito + filtro por dieta con toggle.
5. **Selectores:** nivel de actividad cambiable; voz seleccionable y audible.
6. **Voz:** el micro transcribe y envía.
7. `npm run lint` y `npm run build` en verde.

---

## Progreso

- [x] Bloque 1 — Modo cocina (X única · checkboxes · pasos · URL) · `tsc` 0
- [x] Bloque 2 — Click receta del plan no abre el selector del slot · `tsc` 0
- [x] Bloque 3 — Selección en slot: plegables/filtros + filtro por dieta · `tsc` 0 · `lint` 0
- [x] Bloque 4 — Selectores Radix en Dialog (voz + nivel de actividad) · `tsc` 0
- [x] Bloque 5 — Dictado por voz (micrófono) · `tsc` 0
- [x] Verificación final · `lint` 0 · `build` OK (16/16)

> Pendiente: pruebas manuales en navegador con sesión iniciada (Google Sign-In), no
> automatizables desde aquí — ver checklist "Verificación final".
