'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, Link2, Scale, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * "El Librito": guía de referencia siempre disponible (a diferencia del tour,
 * que solo se ve una vez). Escritorio únicamente, por decisión del usuario —
 * misma razón que Mi Laboratorio: la UI móvil se sustituirá por la app nativa.
 */

function ChapterTitle({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 text-left">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <div>
        <p className="font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
      </div>
    </div>
  );
}

export default function LibritoPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/dashboard" aria-label="Volver al planificador">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary leading-none mb-1 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> El Librito
            </p>
            <h1 className="text-2xl font-bold font-headline leading-tight">Trucos y consejos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cosas que conviene saber para sacarle el máximo partido a Nutrilp — y a tu relación con la comida.
            </p>
          </div>
        </div>

        <Accordion type="multiple" defaultValue={['redes']} className="space-y-3">
          <AccordionItem value="redes" className="rounded-lg border px-4 bg-glass">
            <AccordionTrigger className="hover:no-underline py-4">
              <ChapterTitle
                icon={Link2}
                title="Importar recetas de Instagram, TikTok o YouTube"
                subtitle="Cómo funciona y qué revisar siempre"
              />
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3 text-sm text-muted-foreground">
              <p>
                En <strong className="text-foreground">Nueva Receta → Importar</strong> pega el enlace del vídeo o
                post. Nutrilp analiza el contenido (vídeo, descripción o transcripción) y te rellena el nombre, los
                ingredientes y los pasos automáticamente.
              </p>
              <p className="text-foreground font-medium">Antes de guardarla, revisa esto:</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  <strong className="text-foreground">Cantidades ambiguas.</strong> Si el influencer dice
                  &ldquo;fruta variada&rdquo;, &ldquo;verdura al gusto&rdquo; o &ldquo;un chorrito&rdquo;, la IA tiene
                  que adivinar una cantidad — no existe en ninguna base de datos. Ajusta a lo que tú realmente vayas
                  a poner.
                </li>
                <li>
                  <strong className="text-foreground">Ingredientes que varían mucho.</strong> Una &ldquo;salsa
                  casera&rdquo; o un &ldquo;aliño especial&rdquo; puede tener macros muy distintos según quién lo
                  haga. Si te importa la precisión, sustitúyelo por algo de la base de datos que se le parezca.
                </li>
                <li>
                  <strong className="text-foreground">Marcas y productos concretos.</strong> Si el vídeo usa un
                  producto de marca (un yogur, una salsa…), compruébalo con el buscador de código de barras — suele
                  ser más exacto que la estimación de la IA.
                </li>
              </ul>
              <p>
                En resumen: la importación te ahorra el tecleo, pero la revisión final la haces tú. Es tu receta, no
                la del vídeo.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="macros" className="rounded-lg border px-4 bg-glass">
            <AccordionTrigger className="hover:no-underline py-4">
              <ChapterTitle
                icon={Scale}
                title="Trucos para que tus macros salgan más precisos"
                subtitle="Pequeños detalles que marcan la diferencia"
              />
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-foreground">Aceite en spray:</strong> aunque el bote indique ~900 kcal por
                  100 g (es aceite puro), un par de pulsaciones apenas llegan a 1 g. Pésalo una vez para saber cuánto
                  sale por pulsación y así no lo cuentes como si echaras aceite a chorro.
                </li>
                <li>
                  <strong className="text-foreground">Bebidas y salsas &ldquo;cero&rdquo;/&ldquo;zero&rdquo;:</strong>{' '}
                  perfectas para marinar, dar sabor a salsas o cocinar carnes — aportan sabor con calorías
                  prácticamente nulas. Nutrilp ya distingue &ldquo;Salsa barbacoa cero&rdquo; de la normal en el
                  catálogo.
                </li>
                <li>
                  <strong className="text-foreground">Crudo vs. cocinado:</strong> el arroz, la pasta o las legumbres
                  cambian mucho de peso al cocerse (absorben agua). Usa el ingrediente que corresponda al momento en
                  que pesas — &ldquo;Arroz&rdquo; (crudo) y &ldquo;Arroz blanco cocido&rdquo; no son intercambiables.
                </li>
                <li>
                  <strong className="text-foreground">Pesa cuando puedas.</strong> Una báscula de cocina barata da
                  mucha más precisión que calcular a ojo — sobre todo en ingredientes densos en calorías como
                  aceites, frutos secos o quesos.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="app" className="rounded-lg border px-4 bg-glass">
            <AccordionTrigger className="hover:no-underline py-4">
              <ChapterTitle
                icon={Sparkles}
                title="Sácale partido a la app"
                subtitle="Funciones que a veces pasan desapercibidas"
              />
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-foreground">Las recetas Nutrilp son generales.</strong> Cópialas a
                  &ldquo;Mis Recetas&rdquo; y ajusta las cantidades a tu ración real — el recetario base es un punto
                  de partida, no una receta cerrada.
                </li>
                <li>
                  <strong className="text-foreground">La lista de la compra no se rellena sola:</strong> tienes que
                  pulsar &ldquo;Generar desde el Plan&rdquo; cada vez que cambies el menú de la semana.
                </li>
                <li>
                  <strong className="text-foreground">Edita el plan a tu gusto:</strong> añade o quita comidas en
                  cada día y cámbiales el tipo (desayuno, cena…) — ese tipo es la pista que uso para autocompletarte
                  bien, así que cuanto más preciso lo dejes, mejor te acierto.
                </li>
                <li>
                  <strong className="text-foreground">Guarda las semanas redondas.</strong> Si un menú te ha quedado
                  perfecto, guárdalo en el Historial y recupéralo el mes que viene con dos clics.
                </li>
                <li>
                  <strong className="text-foreground">El asistente hace más de lo que parece:</strong> pídele que
                  invente una receta, que te rellene huecos concretos del plan o que resuelva dudas de nutrición —
                  también puedes hablarle por voz.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="relacion" className="rounded-lg border px-4 bg-glass">
            <AccordionTrigger className="hover:no-underline py-4">
              <ChapterTitle
                icon={Heart}
                title="Buena relación con la comida"
                subtitle="Lo más importante de todo este librito"
              />
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3 text-sm text-muted-foreground">
              <p>
                Nutrilp te da un plan, pero un plan es una <strong className="text-foreground">guía</strong>, no un
                contrato que firmas. La vida real no siempre encaja en un cuadrante, y no pasa nada.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-foreground">Saltarte una comida no arruina nada.</strong> Ni el día, ni la
                  semana, ni tu progreso. Simplemente sigue con la siguiente.
                </li>
                <li>
                  <strong className="text-foreground">Las comidas libres son parte del plan, no un fallo.</strong> Si
                  las configuraste en tu Entrevista, el plan ya cuenta con ellas — disfrútalas sin remordimientos.
                </li>
                <li>
                  <strong className="text-foreground">Ningún alimento es &ldquo;trampa&rdquo;.</strong> Comer no es
                  un examen que apruebas o suspendes. Verás que en Nutrilp nunca usamos esa palabra — lo llamamos
                  &ldquo;comida libre&rdquo; a propósito.
                </li>
                <li>
                  Si un día te sales del plan más de lo previsto, el día siguiente no hace falta &ldquo;compensar&rdquo;
                  de más — vuelve, sin más, a tu ritmo normal.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
