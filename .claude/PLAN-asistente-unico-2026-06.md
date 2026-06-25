# NutriPlanner — Revisión profesional por bloques

> El plan maestro anterior (overhaul del 2026-06-24, bloques 1–8, ya completado) se ha
> archivado en [`PLAN-overhaul-2026-06-24.md`](./PLAN-overhaul-2026-06-24.md).

## Contexto

El usuario quiere una revisión completa de la app, bloque por bloque, para corregir lo que no
funciona bien y elevar la calidad a "producto profesional". Tres problemas concretos motivan el
arranque, confirmados en el código:

1. **El asistente por voz no pide permiso de micrófono.** El hook `use-speech-recognition.ts`
   confía en el permiso *implícito* de la Web Speech API y nunca lo solicita de forma explícita.
   Además `assistant-dialog.tsx` **no consume el estado `error` del hook**, así que cuando el
   permiso falla, el navegador no lo soporta (p.ej. Firefox oculta el botón) o no hay red, el botón
   no hace nada y el usuario no recibe ningún aviso. (El usuario prueba en `localhost`, que sí es
   contexto seguro → el permiso *debería* salir; el fallo real es la falta de petición explícita +
   errores silenciados.)

2. **Hay dos IAs duplicadas y confusas, ambas llamadas "NutriBot".**
   - `AssistantDialog` (panel `assistant`, icono Wand2) → `assistant-flow.ts`: chatea y ejecuta
     acciones del plan, con voz.
   - `RecipeChatDialog` (panel `ai-chat`, icono Sparkles) → `recipe-chat-flow.ts`: chatea para
     generar una receta.
   Peor aún, "crear receta IA" aparece en **3 entradas** con nombres distintos: menú flotante
   ("Asistente" y "Crear receta IA") y cabecera de la biblioteca ("Asistente IA"). Decisión del
   usuario: **un único asistente "todo en uno"** (dudas + acciones del plan + crear recetas); el
   chatbot desaparece.

3. **No le gusta el comportamiento de la IA:** se sale del tema y el tono/longitud no encaja. Hay
   que reescribir el prompt para anclarlo al dominio de NutriPlanner y hacerlo conciso y natural.

Trabajaremos **por bloques, implementando y verificando cada uno** antes de pasar al siguiente.
Los bloques 1–3 cubren las peticiones explícitas; 4–5 son el pulido profesional.

> Nota: la IA usa Genkit + Gemini (`src/ai/genkit.ts`, `googleai/gemini-2.5-flash`). Se mantiene el
> proveedor; solo cambian prompts y arquitectura de los flujos.

---

## Bloque 1 — Asistente único "todo en uno"

**Objetivo:** un solo asistente que (a) responde dudas, (b) ejecuta acciones del plan y (c) **crea
recetas**, reutilizando la infraestructura existente. Eliminar el chatbot duplicado.

- **Añadir la capacidad de crear receta al catálogo** `src/lib/assistant-actions.ts`: nueva acción
  `create_recipe` (no destructiva) con args `{ description: string }` (lo que el usuario quiere:
  ingredientes, tipo de comida, restricciones…). El prompt permitirá que el asistente haga preguntas
  de aclaración en el chat antes de emitir la acción, conservando el matiz conversacional sin un
  componente aparte.
- **Generación de receta:** convertir `recipe-chat-flow.ts` en un `generate-recipe-flow.ts` que
  produce **una** receta `Omit<Recipe,'id'>` a partir de la descripción, respetando objetivo y dieta.
  Se reutiliza tal cual la lógica/prompt ya existentes de `recipeChatFlow`/`recipeSuggestionsFlow`
  (macros, `imageHint`, `dietTags`) y el esquema `RecipeSchema`.
- **Ejecución en cliente:** en `assistant-dialog.tsx`, cuando la acción sea `create_recipe`, llamar
  al flujo de generación y abrir el `RecipeDialog` en modo `create` **prerrellenado** para que el
  usuario revise y guarde. Se reutiliza el callback existente `handleAiRecipeGenerated`
  (`use-dashboard.ts`) y el camino de guardado cliente (memoria de arquitectura de guardado).
  → El asistente recibe una nueva prop `onCreateRecipe(description)` que orquesta generar + abrir
  diálogo (`AssistantDialog` ya recibe props del dashboard; añadimos esta).
- **Eliminar el chatbot duplicado:**
  - Borrar `recipe-chat-dialog.tsx` y la rama de chat de `recipe-chat-flow.ts`.
  - Quitar `ai-chat` de `PanelType` (`src/lib/types.ts`) y todas sus referencias.
  - Menú flotante (`floating-menu.tsx`): eliminar la entrada "Crear receta IA"; dejar solo
    "Asistente".
  - Biblioteca (`recipe-library.tsx`): el botón "Asistente IA" pasa a abrir el asistente único
    (renombrar a "Asistente" / icono Wand2); revisar `FeatureHint`.
  - Dashboard (`dashboard/page.tsx`): eliminar el montaje de `RecipeChatDialog`.
- **Paridad móvil:** `mobile/recipes/page.tsx` (y donde aplique) deja de montar `RecipeChatDialog` y
  monta el asistente único; pasarle el contexto real (objetivo + dieta) en vez de
  `nutritionalGoal={null}`. Así el móvil gana acciones + voz + creación de recetas.

**Archivos clave:** `src/lib/assistant-actions.ts`, `src/hooks/use-assistant-actions.ts`,
`src/ai/flows/recipe-chat-flow.ts` → `generate-recipe-flow.ts`, `assistant-dialog.tsx`,
`floating-menu.tsx`, `recipe-library.tsx`, `dashboard/page.tsx`, `mobile/recipes/page.tsx`,
`src/lib/types.ts`. **A borrar:** `recipe-chat-dialog.tsx`.

---

## Bloque 2 — Voz y micrófono robustos

**Objetivo:** que el micro pida permiso de forma explícita y que cualquier fallo se comunique.

- **Petición explícita de permiso** en `use-speech-recognition.ts`: antes de `rec.start()`, llamar a
  `navigator.mediaDevices.getUserMedia({ audio: true })` (y/o `navigator.permissions.query`) para que
  el navegador muestre el diálogo estándar y obtengamos un grant/deny claro. Liberar el track tras
  confirmar el permiso.
- **Exponer y mapear errores:** el hook ya tiene estado `error`; mapear los códigos de
  SpeechRecognition (`not-allowed`/`service-not-allowed`, `no-speech`, `audio-capture`, `network`) a
  mensajes en español. `assistant-dialog.tsx` debe **consumir `error`** y mostrar un toast
  (reutilizando `useToast`).
- **Sin soporte:** si `isSupported` es `false`, en vez de ocultar el micro sin más, mostrar una pista
  ("Tu navegador no admite dictado por voz; escribe tu instrucción"). Cubre el caso Firefox.
- **Feedback de escucha:** estado visible "Escuchando…" (ya parcialmente presente) y cancelación
  limpia.

**Archivos clave:** `src/hooks/use-speech-recognition.ts`, `assistant-dialog.tsx`. (TTS en
`use-speech-synthesis.ts` se mantiene; solo verificación.)

---

## Bloque 3 — Prompt y comportamiento de la IA

**Objetivo:** anclar la IA a NutriPlanner y mejorar tono/longitud (las dos quejas del usuario).

- **Reescribir el prompt del asistente** (`assistant-flow.ts`): persona "asistente de NutriPlanner"
  con alcance explícito (planificar comidas, recetas, objetivos nutricionales, lista de compra);
  si preguntan fuera de ese ámbito, redirigir amablemente. Tono cercano, **conciso (1–3 frases)**,
  natural, sin tecnicismos. Reforzar: no inventar recetas/días/comidas fuera del contexto; respetar
  dieta y objetivo activos. Añadir 2–3 ejemplos (few-shot) que incluyan el caso `create_recipe`.
- **Alinear el prompt de generación de receta** (`generate-recipe-flow.ts`): respetar dieta/objetivo
  y devolver datos completos y realistas; mantener `imageHint` y `dietTags`.

**Archivos clave:** `src/ai/flows/assistant-flow.ts`, `generate-recipe-flow.ts`.

---

## Bloque 4 — Consistencia, código muerto y UX

**Objetivo:** coherencia visual/funcional tras la unificación.

- Unificar **nombres e iconos** de las entradas de IA (resultado del Bloque 1): un único "Asistente".
- **Código muerto/imports** sin uso (p.ej. en `recipe-library.tsx`, restos de `RecipeChat*`); se
  detectan con lint en el Bloque 5.
- **Coherencia de errores**: todos los flujos de IA usan `getAiErrorMessage`/`isRetryableAiError`
  (`src/lib/ai-error.ts`); aplicar el mismo patrón al asistente unificado (hoy `assistant-dialog`
  solo usa `getAiErrorMessage`, sin acción de reintento).
- Revisar el **menú flotante** (queda con ~6 acciones) y agrupación visual de las herramientas de IA.
- Render seguro de mensajes: el `dangerouslySetInnerHTML` + regex de `RecipeChatDialog` desaparece al
  borrarlo; el asistente unificado renderiza texto plano (sin riesgo de inyección).

**Archivos clave:** `floating-menu.tsx`, `recipe-library.tsx`, `assistant-dialog.tsx`.

---

## Bloque 5 — Calidad: build, lint, tipos y accesibilidad

**Objetivo:** dejar la base sólida y sin regresiones (el build ya exige tipos+lint).

- Ejecutar `npm run lint` y `npm run build`; corregir lo que rompa la unificación.
- **Accesibilidad:** `aria-label`/`title` en botones de icono (diálogos del asistente, micro/voz),
  foco al abrir diálogos y contraste de los FAB de colores del menú flotante.
- Verificación funcional end-to-end (ver abajo).

---

## Verificación (end-to-end)

1. `npm run dev` y abrir `http://localhost:9002` (o el puerto configurado) en **Chrome/Edge**.
2. **Voz/permiso:** abrir Asistente → pulsar el micro → confirmar que el navegador **pide permiso**;
   denegar y comprobar que aparece un toast claro; aceptar y dictar una instrucción.
   Probar en Firefox para ver el mensaje de "sin soporte".
3. **Asistente único:** un solo botón "Asistente" en escritorio y móvil; verificar:
   - Dudas ("¿cuántas calorías llevo el lunes?") → respuesta breve y al tema.
   - Acción ("añade ensalada césar a la cena del martes" / "vacía el lunes" con confirmación).
   - Crear receta ("créame una cena vegana alta en proteína") → abre `RecipeDialog` prerrellenado;
     guardar y verla en la biblioteca.
4. **Sin chatbot:** confirmar que ya no existe "Crear receta IA"/"Asistente IA" duplicados ni el
   panel `ai-chat`.
5. **Comportamiento:** preguntar algo fuera de tema → la IA redirige amablemente; respuestas concisas.
6. `npm run lint` y `npm run build` en verde.

---

## Progreso

- [x] Bloque 1 — Asistente único "todo en uno" · `tsc` 0 · `lint` 0
- [x] Bloque 2 — Voz y micrófono robustos · `tsc` 0 · `lint` 0
- [x] Bloque 3 — Prompt y comportamiento de la IA · `tsc` 0 · `lint` 0
- [x] Bloque 4 — Consistencia, código muerto y UX · `tsc` 0 · `lint` 0
- [x] Bloque 5 — Calidad: build, lint, a11y · `build` OK (16/16) · `lint` 0 · `tsc` 0

### Verificación funcional pendiente (manual, en navegador con tu login + GEMINI_API_KEY)
- Voz: abrir Asistente → micro → el navegador pide permiso; denegar muestra toast; aceptar dicta.
- Asistente único: dudas, acción ("vacía el lunes" pide confirmación), crear receta (abre diálogo).
- Confirmar que no quedan "Crear receta IA"/"Asistente IA" duplicados.
