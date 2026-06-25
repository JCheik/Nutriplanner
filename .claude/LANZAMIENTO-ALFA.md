# Nutrilp — Checklist de lanzamiento alfa

> Camino mínimo para poner la app en manos de testers reales (alfa cerrado).
> Distinto de [`HOJA-DE-RUTA.md`](./HOJA-DE-RUTA.md), que recoge mejoras post-alfa.
>
> Última actualización: 2026-06-25.

## 🔴 Bloqueantes (sin esto no hay alfa)

- [ ] **Activar facturación de Gemini / Google AI.** El free tier es de **20 requests/día**
  (`generativelanguage.googleapis.com/generate_content_free_tier_requests`), que se agota en una
  sola sesión de pruebas y deja el asistente, el autocompletar y la generación de recetas con
  error 429. El código ya muestra un toast de reintento, pero para usuarios reales hay que pasar
  a un plan con facturación. Revisar también el modelo usado (`gemini-2.5-flash`) y poner límites
  de gasto/alertas de presupuesto en Google Cloud.

- [ ] **Desplegar en HTTPS** (Firebase Hosting, que ya se usa).
  - El micrófono (SpeechRecognition) y la voz **solo funcionan en contexto seguro (HTTPS)** —
    en producción no irán hasta desplegar.
  - Configurar `GEMINI_API_KEY` del lado servidor en el entorno de producción.
  - Añadir el dominio de hosting a **Auth → Dominios autorizados**.

- [ ] **Publicar las reglas** de Firestore y Storage (`firebase deploy --only firestore:rules,storage`).
  - Las de Firestore ya están bien escritas (modelo de propiedad por usuario, escritura global
    solo admin). Solo hay que asegurarse de que están publicadas en producción.

- [ ] **Descargo nutricional** ("esto no es consejo médico, consulta a un profesional").
  - La app da objetivos de calorías/macros a gente real. Página/aviso estático sencillo.

## 🟠 Muy recomendable (es el alfa de *Nutrilp*)

- [ ] **Branding Nutrilp**: iconos PWA (`public/icons/`) y logo siguen siendo de NutriPlanner.
  Es lo primero que ve un tester al instalar la app.
- [ ] **Canal de feedback**: botón "Enviar feedback" (mailto o formulario). Es el sentido del alfa.

## 🟢 No bloquean (post-alfa)

- Micrófono en Opera (degrada bien; funciona en Chrome/Edge).
- Código de barras, historial semanal, compartir receta, etc. → ver `HOJA-DE-RUTA.md`.

## Atajo práctico: OAuth en modo "testing"

Para un alfa cerrado, dejar el consentimiento de Google OAuth en modo **testing** y añadir los
emails de los testers (hasta 100). Así **no se necesita verificación de OAuth** (que exige
política de privacidad revisada por Google y tarda semanas). La política de privacidad pasa de
bloqueante a recomendable; el descargo nutricional sí desde el día 1.

## Camino mínimo a alfa

1. Activar facturación de Gemini (+ límites de gasto).
2. Branding Nutrilp (iconos + logo) — único punto que toca código de la app.
3. Descargo nutricional.
4. Deploy a Firebase Hosting + reglas + dominio autorizado.
5. Añadir emails de testers en OAuth (modo testing).
