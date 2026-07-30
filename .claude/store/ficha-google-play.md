# Ficha de Google Play — Nutrilp

> Textos listos para pegar. **Reescritos el 2026-07-30**: el borrador anterior
> (en `LANZAMIENTO-APP-NATIVA.md`) prometía dos funciones que ya no existen —
> "marca lo que vas comiendo" (el diario salió de la app el 2026-07-27, Nutrilp
> planifica y no lleva conteo diario) y el escáner de código de barras (retirado
> el 2026-07-25). Publicar eso habría sido publicidad engañosa y una fuente
> garantizada de reseñas de una estrella.

## Nombre

```
Nutrilp — Plan de comidas
```

## Descripción corta (máx. 80 caracteres — esta usa 74)

```
Organiza tu semana de comidas, cocina con lo que tienes y compra lo justo.
```

## Descripción larga

```
Nutrilp te ayuda a organizarte, no a contar cada bocado.

Planificas la semana de un vistazo en un cuadrante tipo horario, y la lista de
la compra sale sola de ese plan, ajustada a las raciones que vas a preparar de
verdad. Compras lo justo y tiras menos comida.

• PLAN SEMANAL
Coloca tus recetas en cada día y cada comida, ajusta las raciones y mira al
momento cómo encaja con tu objetivo de calorías y macros. Copia un día entero
en otro, o una comida suelta, para montar la semana en un minuto. Descárgalo en
PDF e imprímelo para la nevera.

• LA COMPRA, COMO UN PÓSIT
La lista se genera de tu plan, agrupada por pasillo del supermercado. Vas
tachando con el dedo mientras compras.

• TUS RECETAS Y LAS NUESTRAS
Guarda las tuyas y usa el recetario de Nutrilp. ¿Has visto una receta en
Instagram o TikTok? Dale a compartir, elige Nutrilp y te la deja lista con sus
ingredientes y sus macros estimados.

• UN ASISTENTE QUE HACE COSAS
Pídele que llene los huecos de la semana, que te invente una receta con lo que
te apetezca, o hazle una foto a la nevera para que te proponga qué cocinar con
lo que ya tienes.

• MODO COCINA
Pasos grandes, temporizadores que se detectan solos del texto, cantidades
ajustadas a las raciones que prepares y la pantalla que no se apaga.

Nutrilp no es una app de dieta estricta: el plan es una guía, no un contrato.
Por eso puedes dejar margen para tus comidas libres sin que nada te riña.

Nutrilp usa inteligencia artificial (modelos Gemini de Google) para el
asistente, para crear e importar recetas y para analizar la foto de tu nevera.
Lo que genera son estimaciones y puede contener errores: revísalo siempre,
especialmente si tienes alergias.

Aviso: Nutrilp ofrece estimaciones orientativas y no constituye consejo médico
ni nutricional profesional.
```

## Categoría y etiquetas

- **Categoría**: Salud y bienestar (alternativa: Comida y bebida)
- **Etiquetas**: plan de comidas, menú semanal, recetas, lista de la compra,
  macros, batch cooking, organizar la cocina

## Recursos gráficos

| Recurso | Requisito de Play | Estado |
|---|---|---|
| Icono | 512×512 PNG, sin transparencia | ✅ `.claude/store/icon-play-512.png` |
| Gráfico destacado | 1024×500 | ⬜ pendiente |
| Capturas de móvil | mínimo 2, máx 8 · 16:9 o 9:16 | ⬜ **las tiene que hacer el usuario en su móvil** |

**Capturas recomendadas** (en este orden, que cuenta una historia):
1. Plan → Semana, con el cuadrante lleno y las barras de macros.
2. Plan → Hoy, con el anillo y las comidas del día.
3. La compra en pósits.
4. El asistente con Chefie.
5. Modo cocina.

## Declaración de seguridad de los datos (Data safety)

Esto es un formulario largo en Play Console y equivocarse cuesta un rechazo.
Lo que aplica a Nutrilp, verificado contra el código y coherente con
`/privacidad`:

- **Se recogen**: correo electrónico y nombre (cuenta) · contenido del usuario
  (recetas, plan, lista de la compra, fotos de recetas) · **información de
  salud**: las alergias de la entrevista.
- **Se comparten con terceros**: sí, con Google (Firebase para almacenamiento y
  Gemini para las funciones de IA) como proveedores de servicio.
- **Las fotos de la nevera**: se envían para procesarse y **no se almacenan**.
- **Cifrado en tránsito**: sí (HTTPS).
- **Se puede pedir el borrado**: sí — desde la propia app, en Perfil → Borrar mi
  cuenta.
- **No hay** anuncios, ni analítica, ni rastreo, ni venta de datos.

## Clasificación de contenido

Sin contenido sensible. En el cuestionario se responde que no a violencia, sexo,
lenguaje, drogas y juego. Sí hay que declarar que la app **permite interactuar
con IA generativa** y que **el usuario puede subir imágenes**.

## Enlaces obligatorios

- Política de privacidad: `https://nutrilp.com/privacidad`
- Términos: `https://nutrilp.com/terminos`
- Correo de contacto: el de `CONTACT_EMAIL` en `src/lib/legal.ts`
