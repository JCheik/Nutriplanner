# Lanzamiento de la app nativa — checklist

> Fase 5 del proyecto (ver `PLAN-app-nativa.md`). Lo que ya está hecho en el repo
> vs. lo que **solo puedes hacer tú** (cuentas, pagos, subidas a tiendas).
> Última actualización: 2026-07-24.

## ✅ Ya preparado en el repo

- **Identidad**: `app.json` con nombre "Nutrilp", slug `nutrilp`, esquema `nutrilp://`,
  color primario terracota, descripción, orientación vertical.
- **Identificadores**: iOS `com.nutrilp.app` (buildNumber 1) · Android `com.nutrilp.app`
  (versionCode 1). Versión de app: `0.1.0`.
- **Iconos**: la "N" de marca (reutilizada de los iconos PWA de la web) como icono de
  app, icono adaptativo de Android (sobre fondo crema) y splash.
- **Permisos**: cámara, con texto en español explicando el uso (código de barras + foto
  de nevera). iOS declara `ITSAppUsesNonExemptEncryption: false` (evita el cuestionario
  de criptografía en cada subida a TestFlight).
- **`eas.json`** con tres perfiles: `development` (dev client), `preview` (APK interno
  para probar sin tiendas) y `production` (store, autoincrementa versiones). Los tres
  heredan de `base` las variables públicas (Firebase + URL de la API).
- **Actualizaciones por aire (EAS Update)**: `expo-updates` instalado y `runtimeVersion`
  con política `appVersion`. **Se metió ANTES del primer build a propósito**: si no
  estuviera dentro del binario, habría que recompilar entero para poder usarlo después.
  Con esto, los cambios que solo tocan JS (casi todo) se publican con `eas update` y la
  app los recoge al reiniciarse, sin build ni reinstalación. Falta rellenar la URL del
  proyecto, que la genera `eas update:configure` tras `eas init`.
- **`npx expo-doctor` pasa 20/20 checks.**

### Por qué la config de Firebase va en `eas.json`

`native/.env` está en `.gitignore` y **EAS no sube archivos ignorados por git**, así que
un build sin esto arrancaría sin config y fallaría al entrar. Son las mismas claves
públicas que la web ya versiona en `apphosting.yaml` (viajan en todos los bundles del
navegador; no son secretas). El secreto de verdad, `GEMINI_API_KEY`, **no está aquí ni
en la app**: vive solo en el servidor web, detrás de los endpoints `/api/ai/*`.

## 🔑 Lo que tienes que hacer tú

1. **Cuenta de Expo** (gratis): crear en expo.dev y `npx eas login` desde `native/`.
   Luego `npx eas init` para vincular el proyecto (escribe el `projectId` en app.json).
2. **Primer build de prueba, sin tiendas** — lo más útil para empezar:
   ```
   npx eas build --profile preview --platform android
   ```
   Genera un APK que te descargas y te instalas en tu móvil. Con eso ya pruebas las
   funciones que Expo Go no permite.
3. **Google Play**: cuenta de desarrollador (pago único ~25 $). Luego
   `npx eas build --profile production --platform android` y `npx eas submit`.
   Empieza por **pruebas internas** (hasta 100 testers por correo, sin revisión larga).
4. **App Store**: Apple Developer Program (99 $/año). `--platform ios` + `eas submit`
   → TestFlight. Ojo: iOS necesita cuenta de pago incluso para TestFlight.
5. **Ficha de tienda**: nombre, descripción corta y larga, capturas (mínimo 2-3 por
   plataforma), icono 512×512, gráfico destacado (Android). Borrador de textos abajo.
6. **Política de privacidad y términos**: **obligatorio** en ambas tiendas, con URL
   pública. Hay que redactarlos y publicarlos en nutrilp.com (p. ej. `/privacidad`).
   Debe cubrir: qué datos se guardan (cuenta, plan, recetas, diario), dónde (Firebase),
   que las fotos de la nevera se envían a Google Gemini para analizarlas, y cómo pedir
   el borrado de la cuenta.
7. **Borrado de cuenta**: ambas tiendas exigen que se pueda borrar la cuenta **desde la
   propia app** (o dar una URL para pedirlo). Hoy solo existe en el panel de admin de la
   web — hay que añadirlo antes de publicar.

## ⚠️ Antes de publicar (deuda conocida)

- **Icono adaptativo de Android**: se está reutilizando el icono PWA, que ya trae fondo
  y esquinas redondeadas. Android recorta ~33 % del borde en algunos móviles, así que la
  "N" puede quedar justa. Conviene una versión de foreground con más margen.
- **Editor manual de recetas**: crear/editar recetas a mano sigue siendo solo web.
- **Sin persistencia offline de Firestore** en la app (limitación del SDK JS en RN):
  sin cobertura no se ve el plan. Si molesta en el súper, evaluar react-native-firebase
  (requiere dev build, que a partir de aquí ya tendrás).
- **Login con Google** en la app: pendiente, necesita OAuth client IDs por plataforma.
  Hoy solo email+contraseña.
- **Pendientes que necesitan dev build** (ya no bloqueados una vez hagas el paso 2):
  recibir "Compartir" desde Instagram/TikTok, y voz por reconocimiento nativo.

## 📝 Borrador de ficha de tienda

> ⚠️ **OBSOLETO — no usar.** La ficha buena está en `.claude/store/ficha-google-play.md`
> (reescrita el 2026-07-30). Lo de abajo promete "marca lo que vas comiendo" y el
> escáner de código de barras, dos funciones **retiradas del producto**. Se deja
> solo como registro de lo que se llegó a redactar.

**Nombre**: Nutrilp — Plan de comidas

**Descripción corta (Android, 80 car.)**:
Organiza tu semana de comidas, cocina con lo que tienes y compra lo justo.

**Descripción larga**:
> Nutrilp te ayuda a organizarte, no a contar cada bocado.
>
> Planifica tu semana de comidas de un vistazo con un cuadrante tipo horario, que puedes
> descargar en PDF e imprimir para la nevera. La lista de la compra sale sola de tu plan
> y ajustada a tus raciones reales, así compras lo justo y tiras menos comida.
>
> • **Plan semanal** — arrastra tus recetas a cada día y comida, ajusta raciones y marca
>   lo que vas comiendo.
> • **Tus recetas y las nuestras** — guarda las tuyas, importa de redes sociales o escanea
>   el código de barras de cualquier producto.
> • **Asistente con IA** — rellena huecos del plan, te inventa recetas y mira una foto de
>   tu nevera para proponerte qué cocinar con lo que ya tienes.
> • **Modo cocina** — pasos grandes, temporizadores automáticos y cantidades ajustadas a
>   las raciones que vayas a preparar.
>
> Nutrilp no es una app de dieta estricta: el plan es una guía, no un contrato.
>
> Aviso: Nutrilp ofrece estimaciones orientativas y no constituye consejo médico ni
> nutricional profesional.

**Categoría**: Salud y forma física / Comida y bebida
**Palabras clave (iOS)**: plan comidas, menú semanal, recetas, lista compra, macros,
batch cooking, organizar cocina
