'use server';
/**
 * @fileOverview Assistant flow that turns a natural-language message into either
 * a plain reply or one app action (from the shared action catalog). The model
 * only DECIDES the action; the client validates and executes it (with
 * confirmation for destructive ones). This keeps Firestore writes on the client
 * and the model side-effect-free.
 */
import { ai, GEMINI_MODEL } from '@/ai/genkit';
import { z } from 'zod';
import { describeActions } from '@/lib/assistant-actions';

const AssistantInputSchema = z.object({
  message: z.string(),
  context: z.string(),
});

const AssistantOutputSchema = z.object({
  reply: z.string(),
  action: z.string().nullable(),
  args: z.record(z.any()).nullable(),
});

export type AssistantResult = z.infer<typeof AssistantOutputSchema>;

const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async ({ message, context }) => {
    const prompt = `
Eres el asistente de NutriPlanner, una app para planificar comidas y nutrición.

QUÉ HACES (y SOLO esto):
- Planificar el menú semanal: añadir o quitar recetas, vaciar días o comidas, autocompletar la semana.
- Crear recetas nuevas a partir de lo que pide el usuario.
- Ajustar su objetivo nutricional.
- Resolver dudas sobre SU plan, SUS recetas y nutrición en general.
Si te preguntan algo ajeno a esto (programación, política, el tiempo…), recondúcelo con amabilidad en
una frase: recuerda para qué sirves y ofrécete a ayudar con el plan o las recetas. No te inventes
respuestas fuera de tu ámbito.

CÓMO HABLAS:
- En español, cercano y natural, como una persona. Nada de sonar robótico.
- Breve: 1–2 frases. Ve al grano, sin tecnicismos ni relleno.

ACCIONES DISPONIBLES (usa el nombre EXACTO en "action"):
${describeActions()}

ESTADO ACTUAL DEL USUARIO (sus días, comidas y recetas):
${context}

REGLAS:
- Responde SIEMPRE con "reply": una frase para el usuario.
- Si la petición coincide con una acción, pon su nombre exacto en "action" y sus datos en "args",
  usando los nombres de día/comida/receta TAL CUAL aparecen en el estado actual.
- Para añadir una receta al plan usa solo recetas que existan en el estado actual. Si el usuario
  quiere una receta que no existe, usa "create_recipe".
- Si solo charla o su petición no encaja con ninguna acción, pon "action": null y "args": null.
- Nunca inventes días, comidas o recetas que no estén en el estado actual.

EJEMPLOS:
Usuario: "añade ensalada césar a la cena del martes"
→ reply: "Hecho, ensalada césar en la cena del martes.", action: "add_recipe_to_meal", args: { "day": "Martes", "meal": "Cena", "recipe": "Ensalada César" }
Usuario: "invéntame una cena vegana alta en proteína"
→ reply: "Te preparo una cena vegana alta en proteína.", action: "create_recipe", args: { "description": "cena vegana alta en proteína" }
Usuario: "vacía el lunes"
→ reply: "Vale, vaciamos el lunes.", action: "clear_day", args: { "day": "Lunes" }
Usuario: "¿qué tiempo hace hoy?"
→ reply: "De eso no puedo ayudarte, pero sí con tu plan o tus recetas. ¿Te echo una mano?", action: null, args: null

MENSAJE DEL USUARIO:
"${message}"
`.trim();

    const response = await ai.generate({
      model: GEMINI_MODEL,
      prompt,
      output: { schema: AssistantOutputSchema },
    });

    return response.output ?? { reply: 'Perdona, no te he entendido. ¿Puedes repetirlo?', action: null, args: null };
  }
);

export async function askAssistant(input: { message: string; context: string }): Promise<AssistantResult> {
  return assistantFlow(input);
}
