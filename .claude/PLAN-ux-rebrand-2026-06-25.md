# Nutrilp — Plan de acción (revisión UX + rebrand)

> Fecha: 2026-06-25.
> Planes anteriores (completados) archivados en
> [`PLAN-asistente-unico-2026-06.md`](./PLAN-asistente-unico-2026-06.md) y
> [`PLAN-overhaul-2026-06-24.md`](./PLAN-overhaul-2026-06-24.md).

## Contexto

Conjunto de mejoras de UX pedidas por el usuario, más el **rebrand de "NutriPlanner" a
"Nutrilp"** (se va a comprar ese dominio). Se trabaja **por bloques, implementando y
verificando cada uno** antes de pasar al siguiente. La IA sigue con Genkit + Gemini; no
cambia el proveedor.

**Decisiones cerradas con el usuario:**
- El **Recetario** se mantiene (colección global intacta); solo se **renombra** la pestaña.
- El **panel de administrador** se mantiene (ya está oculto para no-admins).
- **Objetivos** y **Lista de la compra** se reubican en la barra de la biblioteca; se
  elimina el menú flotante. **Notas** se quita.
- La **URL de receta** se implementa con alcance completo (autorelleno + editable + clicable).
- **Voz elegida** ya se persiste hoy (`nutriplanner.tts.voiceURI`); solo falta el on/off.

**Principio del rebrand:** se renombra **solo el texto visible de marca** a "Nutrilp". Los
**identificadores internos NO se tocan** (colección Firestore `nutriplanner_recipes`, claves
de `localStorage` como `nutriplanner_prefs`/`nutriplanner_onboarding`/`nutriplanner.tts.*`,
nombres de variables/props como `nutriplannerRecipes`/`isNutriPlannerRecipe`, caché del SW),
porque renombrarlos orfanaría datos existentes o exigiría una migración sin beneficio para el
usuario.

---

## Bloque 1 — Voz del asistente persistente

**Objetivo:** que el on/off del altavoz (TTS) se recuerde entre sesiones.

- En [`assistant-dialog.tsx`](../src/components/nutri-planner/assistant-dialog.tsx):
  - Inicializar `voiceOn` leyendo `localStorage` (nueva clave `nutriplanner.tts.enabled`),
    con guarda `typeof window` para SSR.
  - `useEffect` que persista el valor en cada cambio de `voiceOn` (o hacerlo dentro de
    `toggleVoice`).
- La voz seleccionada (`voiceURI`) ya la persiste `use-speech-synthesis.ts` — no se toca.

**Archivos:** `src/components/nutri-planner/assistant-dialog.tsx`.

---

## Bloque 2 — Rebrand "NutriPlanner" → "Nutrilp" (solo texto visible)

**Objetivo:** cambiar la marca en todo el texto que ve el usuario, sin tocar internals.

Renombrar estas cadenas a **"Nutrilp"**:
- `src/app/manifest.ts` — `name` y `short_name` (PWA).
- `src/app/layout.tsx` — `metadata.title` y `openGraph.title`.
- `src/components/layout/page-header.tsx` — logotipo/título de cabecera.
- `src/components/pwa/install-prompt.tsx` — "Instala NutriPlanner".
- `src/app/page.tsx` — "Bienvenido a NutriPlanner".
- `src/firebase/auth/use-user.tsx` — texto por defecto del sticky note de bienvenida
  (aunque Notas se desconecta en el Bloque 6, se renombra por coherencia del dato).
- `src/ai/flows/assistant-flow.ts` — persona "asistente de NutriPlanner".
- `src/ai/flows/generate-recipe-flow.ts` — "asistente de cocina de NutriPlanner".
- `src/app/admin/page.tsx` y `src/app/admin/recipes/page.tsx` — textos de gestión.
- `src/components/nutri-planner/recipe-library.tsx:553` — `CardDescription` ("recetario base
  de NutriPlanner").
- (Opcional, docs) `docs/blueprint.md` "App Name".

**NO tocar:** colección `nutriplanner_recipes`, claves `localStorage`, `NUTRIPLANNER_RECIPES_DATA`,
props `isNutriPlannerRecipe`/`nutriplannerRecipes`, `CACHE = 'nutriplanner-v1'` del SW,
`firestore.rules`, `backend.json`.

**Archivos:** los listados arriba (texto visible).

---

## Bloque 3 — Renombrar pestaña "Recetario" → "Recetas Nutrilp"

**Objetivo:** reflejar que es el catálogo base de la marca; sin cambios de datos ni lógica.

- En [`recipe-library.tsx`](../src/components/nutri-planner/recipe-library.tsx):
  - `TabsTrigger` (línea ~593): "Recetario" → "Recetas Nutrilp".
  - Etiqueta del bloque de búsqueda cruzada (línea ~722): "Recetario (…)" → "Recetas Nutrilp (…)".
- El valor interno del tab (`nutriplanner-recipes`) y la colección **no cambian**.

**Archivos:** `src/components/nutri-planner/recipe-library.tsx`.

---

## Bloque 4 — URL / fuente en la receta (alcance completo)

**Objetivo:** guardar la URL de origen (Instagram/TikTok/YouTube…) y poder abrirla desde la
receta.

- `src/lib/types.ts` — añadir `sourceUrl: z.string().url().optional()` a `RecipeSchema`.
- [`recipe-import-dialog.tsx`](../src/components/nutri-planner/recipe-import-dialog.tsx:306) —
  incluir `sourceUrl: url.trim() || undefined` al construir el `Recipe` (hoy la URL se captura
  y se descarta).
- [`recipe-dialog.tsx`](../src/components/nutri-planner/recipe-dialog.tsx) —
  - Modo crear/editar: campo de URL editable a mano.
  - Modo vista: enlace clicable ("Ver receta original / vídeo") que abre en pestaña nueva
    (`target="_blank" rel="noopener noreferrer"`), solo si hay `sourceUrl`.

**Archivos:** `src/lib/types.ts`, `src/components/nutri-planner/recipe-import-dialog.tsx`,
`src/components/nutri-planner/recipe-dialog.tsx`.

---

## Bloque 5 — Recetas agrupadas por categoría al añadir a un slot

**Objetivo:** que al tocar un slot, la lista de recetas salga organizada por categoría.

- Extraer la lógica de clasificación (`classifyRecipe` + categorías Desayunos/Almuerzos/
  Cenas/Snacks/Otros) de `recipe-library.tsx` a un helper compartido (p.ej.
  `src/lib/recipe-categories.ts`) para no duplicarla.
- En [`recipe-selection-dialog.tsx`](../src/components/nutri-planner/recipe-selection-dialog.tsx):
  agrupar `filteredRecipes` por categoría y renderizar cada grupo bajo una cabecera; mantener
  el buscador y los checkboxes de selección múltiple actuales.
- Afecta a escritorio y móvil (ambos usan este diálogo).

**Archivos:** `src/lib/recipe-categories.ts` (nuevo), `recipe-library.tsx` (refactor para usar
el helper), `recipe-selection-dialog.tsx`.

---

## Bloque 6 — Eliminar menú flotante, reubicar Objetivos/Compra y quitar Notas

**Objetivo:** limpiar los botones flotantes; conservar solo Objetivos y Compra, reubicados.

- Eliminar [`floating-menu.tsx`](../src/components/nutri-planner/floating-menu.tsx) y su uso en
  [`dashboard/page.tsx:93`](../src/app/dashboard/page.tsx).
- En la barra de acciones de la biblioteca
  ([`recipe-library.tsx:556`](../src/components/nutri-planner/recipe-library.tsx)), añadir
  botones **Objetivos** y **Compra** junto a Importar/Escanear/Asistente/Nueva Receta. Requiere
  dos props nuevas (`onGoalsOpen`, `onShoppingListOpen`) cableadas desde `dashboard/page.tsx`
  (`handlePanelOpen('goals')` / `('shopping-list')`).
- **Quitar Notas:** retirar la entrada y el render del panel `sticky-note` del flujo
  (dashboard). Se **desconecta del UI**, pero NO se borra el componente `StickyNote` ni el campo
  `stickyNote` del perfil (datos guardados intactos). `PanelType` puede conservar `'sticky-note'`
  sin uso, o limpiarlo si no quedan referencias.
- Las acciones Asistente / Escanear Nevera / Importar URL ya existen en la cabecera de la
  biblioteca, así que no se pierden al eliminar el menú flotante (en móvil el menú flotante no
  se usa).

**Archivos:** `src/components/nutri-planner/floating-menu.tsx` (borrar),
`src/app/dashboard/page.tsx`, `src/components/nutri-planner/recipe-library.tsx`.

---

## Sin cambios

- **Panel admin**: se mantiene tal cual (ya oculto para no-admins vía `isAdmin`).

---

## Verificación (end-to-end)

1. `npm run dev` y abrir la app en Chrome/Edge.
2. **Voz:** activar el altavoz en el Asistente, recargar → sigue activado; desactivar, recargar
   → sigue desactivado.
3. **Rebrand:** título de pestaña/PWA, cabecera, pantalla de bienvenida y prompt de instalación
   muestran "Nutrilp".
4. **Pestaña:** la biblioteca muestra "Mis Recetas" y "Recetas Nutrilp".
5. **URL:** importar una receta desde URL → la receta guarda la URL; abrirla y comprobar el
   enlace clicable; crear/editar a mano una URL y verla.
6. **Categorías:** tocar un slot → las recetas salen agrupadas por categoría.
7. **Botones:** ya no hay menú flotante; Objetivos y Compra están en la barra de la biblioteca;
   no hay Notas.
8. `npm run lint` y `npm run build` en verde.

---

## Progreso

- [x] Bloque 1 — Voz del asistente persistente · `tsc` 0
- [x] Bloque 2 — Rebrand "NutriPlanner" → "Nutrilp" (texto visible) · `tsc` 0
- [x] Bloque 3 — Renombrar pestaña → "Recetas Nutrilp" · `tsc` 0
- [x] Bloque 4 — URL / fuente en la receta · `tsc` 0
- [x] Bloque 5 — Recetas por categoría al añadir a un slot · `tsc` 0 · `lint` 0
- [x] Bloque 6 — Eliminar menú flotante, reubicar Objetivos/Compra, quitar Notas · `build` OK (16/16) · `tsc` 0 · `lint` 0
