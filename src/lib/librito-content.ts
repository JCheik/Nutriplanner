/**
 * Contenido de "El Librito". Vive aparte de la página a propósito: estaba
 * escrito a mano dentro del JSX y su gemelo en `native/src/app/librito.tsx`, y
 * las dos copias se desincronizaron — llegaron a afirmar que las salsas "cero"
 * no tienen calorías y a mandar al usuario a un escáner de código de barras que
 * se quitó en 2026-07-25.
 *
 * **Si corriges un DATO aquí, corrígelo también en `native/src/app/librito.tsx`.**
 * Los capítulos "macros" y "relacion" deben ser idénticos palabra por palabra;
 * "redes" y "app" pueden diferir porque cada plataforma tiene funciones
 * distintas (clonar recetas es de web; el aviso en segundo plano, de la app).
 */

export interface LibritoBullet {
  lead: string;
  text: string;
}

export interface LibritoChapter {
  id: string;
  title: string;
  subtitle: string;
  intro?: string;
  bullets: LibritoBullet[];
  outro?: string;
}

export const LIBRITO_CHAPTERS: LibritoChapter[] = [
  {
    id: 'redes',
    title: 'Importar recetas de una web, Instagram, TikTok o YouTube',
    subtitle: 'Cada sitio va distinto — aquí el porqué',
    intro:
      'Saco nombre, ingredientes y pasos de lo que me pases. Pero no todos los sitios dejan lo mismo, y conviene saber cuál es cuál para no pelearse con ello:',
    bullets: [
      {
        lead: 'Webs de recetas y YouTube: comparte el enlace y ya está.',
        text: 'Le das a compartir en esa app o en el navegador, buscas Nutrilp en la lista y la tocas. No hace falta ni abrir Nutrilp: me pongo con ella y te aviso. Las webs de recetas suelen traerla ya estructurada y sale clavada; de YouTube me veo el vídeo entero.',
      },
      {
        lead: 'Instagram y TikTok: comparte el VÍDEO, no el enlace.',
        text: 'Estas dos no dejan leer sus publicaciones desde fuera: del enlace lo único que recibo es la palabra «Instagram». No es un fallo de Nutrilp, es una decisión suya, y no hay forma de saltársela. Lo que sí funciona es pasarme el vídeo: ahí escucho lo que dicen y leo lo que sale en pantalla, que es donde está la receta.',
      },
      {
        lead: 'Cómo pasarme el vídeo, paso a paso.',
        text: 'En TikTok: Compartir → «Guardar vídeo», y luego lo compartes conmigo desde la galería. En Instagram: si el reel es de una cuenta pública, prueba los tres puntos (⋯) → «Descargar»; si esa opción no aparece, graba la pantalla mientras se reproduce y compárteme la grabación. Vale igual.',
      },
      {
        lead: 'Si la receta está ESCRITA en el pie, hay un atajo.',
        text: 'Cuando el post trae los ingredientes escritos debajo, no hace falta el vídeo: hazle una captura de pantalla donde se lea el texto y compártemela. La leo igual de bien y es más rápido que descargar nada.',
      },
      {
        lead: 'La guardo yo, pero revísala tú.',
        text: 'Cuando termino, la receta entra directa en Mis recetas con el cartel NUEVA, y el aviso te la abre de un toque. Lo hago así para que no se pierda si cierras la app a medias. Pero repásala antes de fiarte de sus números:',
      },
      {
        lead: 'Las raciones, lo primero.',
        text: 'Si la receta era para ocho y se guarda como una, todos los macros salen ocho veces más altos. Se corrige desde la propia receta, con el botón de editar.',
      },
      {
        lead: 'Cantidades ambiguas.',
        text: 'Si dicen “verdura al gusto” o “un chorrito”, he tenido que adivinar una cantidad. Ajusta a lo que tú vayas a poner de verdad.',
      },
      {
        lead: 'Ingredientes que varían mucho.',
        text: 'Una “salsa casera” puede tener macros muy distintos según quién la haga. Si te importa la precisión, sustitúyela por algo del catálogo que se le parezca.',
      },
      {
        lead: 'Marcas y productos concretos.',
        text: 'Si usan un producto de marca, búscalo en “Producto del súper”: esos datos salen de la etiqueta y son más fiables que mi estimación.',
      },
    ],
    outro:
      'Resumiendo: enlace para webs y YouTube, vídeo para Instagram y TikTok, captura si la receta está escrita. Y la revisión final la haces tú — es tu receta, no la del vídeo.',
  },
  {
    id: 'macros',
    title: 'Trucos para que tus macros salgan más precisos',
    subtitle: 'Pequeños detalles que marcan la diferencia',
    bullets: [
      {
        lead: 'Aceite en spray:',
        text: 'aunque el bote marque ~900 kcal/100 g (es aceite puro), un par de pulsaciones apenas llegan a 1 g. Pésalo una vez para saber cuánto sale por pulsación, y así no lo cuentes como si echaras aceite a chorro.',
      },
      {
        lead: 'Bebidas «cero»:',
        text: 'los refrescos zero rondan 0-1 kcal por 100 ml. Ahí sí puedes olvidarte de la cuenta y usarlos para dar sabor.',
      },
      {
        lead: 'Salsas «cero» o «light»: ojo, no son cero.',
        text: 'Bajan mucho respecto a la normal, pero siguen sumando: un kétchup sin azúcar ronda las 25 kcal/100 g, una barbacoa cero puede pasar de 50 y una mayonesa light sigue por encima de 250. Míralo en la etiqueta y cuéntalas.',
      },
      {
        lead: 'Crudo vs. cocinado:',
        text: 'el arroz, la pasta o las legumbres cambian mucho de peso al cocerse, porque absorben agua. Usa el ingrediente que corresponda al momento en que pesas: «Arroz» (crudo) y «Arroz blanco cocido» no son intercambiables.',
      },
      {
        lead: 'Pesa cuando puedas.',
        text: 'Una báscula de cocina barata da mucha más precisión que calcular a ojo, sobre todo en cosas densas en calorías como aceites, frutos secos o quesos.',
      },
    ],
  },
  {
    id: 'app',
    title: 'Sácale partido a Nutrilp',
    subtitle: 'Funciones que a veces pasan desapercibidas',
    bullets: [
      {
        lead: 'Las recetas Nutrilp son generales.',
        text: 'Son un punto de partida, no una receta cerrada. Dale a «Clonar» para hacerte tu propia versión y ajustar las cantidades a tu ración real.',
      },
      {
        lead: 'La lista de la compra no se rellena sola:',
        text: 'tienes que pulsar «Generar desde el Plan» cada vez que cambies el menú de la semana.',
      },
      {
        lead: 'Edita el plan a tu gusto:',
        text: 'el tipo de cada comida (desayuno, cena…) es la pista que uso para autocompletarte bien, así que cuanto más preciso lo dejes, mejor te acierto.',
      },
      {
        lead: 'Guarda las semanas redondas.',
        text: 'Si un menú te ha quedado perfecto, guárdalo en el Historial y recupéralo el mes que viene con dos clics.',
      },
      {
        lead: 'El asistente hace más de lo que parece:',
        text: 'pídele que invente una receta, que te rellene huecos concretos del plan o que resuelva dudas de nutrición. También puedes hablarle por voz.',
      },
    ],
  },
  {
    id: 'relacion',
    title: 'Buena relación con la comida',
    subtitle: 'Lo más importante de todo este librito',
    intro:
      'Nutrilp te da un plan, pero un plan es una guía, no un contrato que firmas. La vida real no siempre encaja en un cuadrante, y no pasa nada.',
    bullets: [
      {
        lead: 'Saltarte una comida no arruina nada.',
        text: 'Ni el día, ni el progreso, ni la semana. Sigue con la siguiente y ya está.',
      },
      {
        lead: 'Las comidas libres son parte del plan, no un fallo.',
        text: 'El día que comas fuera, borra del cuadrante la comida que te saltes: al final estás cambiando una comida por otra, no sumando una de más. Disfrútala sin remordimientos.',
      },
      {
        lead: 'Ningún alimento es «trampa».',
        text: 'Comer no es un examen que apruebas o suspendes. Por eso aquí nunca usamos esa palabra: lo llamamos «comida libre» a propósito.',
      },
      {
        lead: 'No hace falta «compensar».',
        text: 'Si un día te sales del plan más de lo previsto, al siguiente vuelves a tu ritmo normal, sin castigos.',
      },
    ],
  },
];
