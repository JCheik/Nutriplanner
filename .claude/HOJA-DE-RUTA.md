# Nutrilp — Hoja de ruta (ideas para más adelante)

> Backlog de funcionalidades y mejoras que NO se abordan en el plan de acción actual
> (`PLAN.md`). Aquí se aparcan para priorizarlas en futuras iteraciones. Mover una entrada
> a `PLAN.md` cuando se decida trabajarla.
>
> Última actualización: 2026-06-25.

---

## Producto / funcionalidades

- [ ] **Escanear código de barras con el móvil** *(petición del usuario)*
  - Leer el código de barras de un producto (cámara del móvil) para identificarlo y traer sus
    datos nutricionales (kcal/macros por 100 g) a un ingrediente o receta.
  - Requiere: acceso a cámara (PWA, `getUserMedia` + un lector de códigos, p. ej.
    `BarcodeDetector` nativo donde exista, o librería tipo `zxing`/`quagga` como fallback) y
    una fuente de datos (Open Food Facts es gratuita y abierta).
  - Encaja con el flujo de "Escanear Nevera" ya existente.

- [ ] **Importar receta desde texto libre** (además de URL).
  - Pegar el texto de una receta y que la IA la estructure (hoy solo se importa por URL).

- [ ] **Compartir receta** (enlace o imagen para redes sociales).

- [ ] **Historial de plan semanal** — guardar semanas pasadas para ver evolución.

- [ ] **Progreso de macros diario** — gráfica de consumido vs. objetivo del día.

- [ ] **Filtro por dieta más allá del slot** — aplicar `dietPreference` también en la
  biblioteca de recetas, no solo al añadir a un slot.

---

## Marca / Nutrilp

- [ ] **Iconos y logo PWA** con la identidad de Nutrilp.
  - Hoy `public/icons/` y el componente `Logo` siguen siendo los genéricos de NutriPlanner.
  - Generar set de iconos (192/512, maskable) + favicon + logo de cabecera.

- [ ] **Onboarding** adaptado a la marca y al flujo simplificado (revisar `WelcomeGuide`).

---

## Infraestructura / dominio

- [ ] **Firebase Hosting + dominio `nutrilp.com`** (cuando se compre).
  - Añadir `nutrilp.com` a **Auth → Dominios autorizados**.
  - Configurar el dominio personalizado en Hosting.

- [ ] **OG tags** en `layout.tsx` (`openGraph.url`, `openGraph.siteName`, imagen de
  previsualización con la marca Nutrilp).
