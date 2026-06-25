# Plan de implementación — NutriPlanner

## Instrucciones de ejecución
Ejecutar los pasos en orden de prioridad. Después de cada paso, realizar 
una auditoría completa antes de continuar. No avanzar si la auditoría falla.

---

## STEP 1 — Contadores de recetas por carpeta
**Archivo:** src/components/nutri-planner/recipe-library.tsx
**Tarea:** Añadir prop `count` a FolderButton con badge pill. 
El botón "Sin carpeta" muestra recetas sin carpeta asignada.

**AUDIT:**
- [ ] El badge aparece visualmente junto al nombre de la carpeta
- [ ] El contador es correcto (contar recetas por carpeta en runtime)
- [ ] "Sin carpeta" muestra el conteo correcto
- [ ] No hay errores TypeScript: `tsc --noEmit` exits 0
- [ ] No hay regresiones visuales en la biblioteca
- Imprimir: `✓ STEP 1 AUDIT: PASS`

---

## STEP 2 — Estado vacío con CTA
**Archivo:** src/components/nutri-planner/recipe-library.tsx
**Tarea:** Mostrar ilustración + texto + botones CTA cuando carpeta vacía.

**AUDIT:**
- [ ] Al seleccionar carpeta vacía aparece el estado vacío (no pantalla en blanco)
- [ ] Botón "Crear receta" abre el diálogo con la carpeta preseleccionada
- [ ] Botón "Mover recetas existentes" abre el selector
- [ ] `tsc --noEmit` exits 0
- Imprimir: `✓ STEP 2 AUDIT: PASS`

---

## STEP 3 — Acciones rápidas en tarjeta (hover)
**Archivo:** src/components/nutri-planner/recipe-card.tsx
**Tarea:** Overlay al hover con botones ➕ 📋 ✏️. En móvil: menú kebab.

**AUDIT:**
- [ ] Hover muestra overlay con los 3 botones de icono
- [ ] Cada botón ejecuta su acción correctamente
- [ ] En viewport < 768px aparece menú kebab en lugar del overlay
- [ ] `tsc --noEmit` exits 0
- [ ] No hay regresiones en recipe-card en otros contextos (plan semanal, etc.)
- Imprimir: `✓ STEP 3 AUDIT: PASS`

---

## STEP 4 — Persistencia de orden y vista
**Archivo:** src/hooks/use-recipe-state.ts
**Tarea:** Guardar `sortCriteria` y `viewMode` en localStorage bajo `nutriplanner_prefs`.

**AUDIT:**
- [ ] Cambiar orden, recargar página → orden persiste
- [ ] Cambiar vista grid/lista, recargar → vista persiste
- [ ] `tsc --noEmit` exits 0
- Imprimir: `✓ STEP 4 AUDIT: PASS`

---

## STEP 5 — Búsqueda global cruzada
**Archivo:** src/components/nutri-planner/recipe-library.tsx
**Tarea:** Con texto en buscador, mostrar resultados de ambas pestañas agrupados.

**AUDIT:**
- [ ] Buscar término que existe en "Mis recetas" Y en "NutriPlanner" → aparecen ambos grupos
- [ ] Sin texto en buscador → comportamiento actual sin cambios
- [ ] `tsc --noEmit` exits 0
- Imprimir: `✓ STEP 5 AUDIT: PASS`

---

## STEP 6 — Categorías automáticas por tipo de comida
**Archivo:** src/hooks/use-recipe-state.ts + recipe-library.tsx
**Tarea:** Sección "Categorías inteligentes" con useMemo. Sin escritura en Firestore.

**AUDIT:**
- [ ] Sección aparece sobre las carpetas manuales
- [ ] Las recetas se clasifican correctamente (Desayunos, Almuerzos, Cenas, Snacks, Otros)
- [ ] Sin escritura en Firestore (verificar en Network tab o logs)
- [ ] `tsc --noEmit` exits 0
- Imprimir: `✓ STEP 6 AUDIT: PASS`

---

## STEP 7 — Drag & drop visual mejorado
**Archivos:** recipe-library.tsx + recipe-card.tsx
**Tarea:** Opacidad 50% al arrastrar, borde pulsante en destino, toast de confirmación.

**AUDIT:**
- [ ] Tarjeta arrastrada muestra opacidad 50% y cursor grabbing
- [ ] Carpeta destino muestra borde pulsante animado
- [ ] Toast aparece al soltar: "Receta movida a [nombre carpeta]"
- [ ] `tsc --noEmit` exits 0
- Imprimir: `✓ STEP 7 AUDIT: PASS`

---

## STEP 8 — Panel de carpetas colapsable en móvil
**Archivo:** src/components/nutri-planner/recipe-library.tsx
**Tarea:** En < 768px convertir panel lateral en bottom sheet (shadcn Sheet).

**AUDIT:**
- [ ] En viewport < 768px el panel lateral no aparece al cargar
- [ ] Botón "Carpetas" en barra superior abre el Sheet
- [ ] Las recetas ocupan pantalla completa con panel cerrado
- [ ] `tsc --noEmit` exits 0
- Imprimir: `✓ STEP 8 AUDIT: PASS`
