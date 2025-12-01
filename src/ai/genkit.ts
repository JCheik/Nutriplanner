/**
 * @fileoverview Este archivo inicializa la configuración de Genkit
 * con el plugin de Google AI y exporta el objeto 'ai' configurado.
 */

// Importamos la función de configuración (genkit) y el objeto de AI (ai)
import {genkit, ai} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// 1. Inicializa y configura el entorno global de Genkit
genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});

// 2. Exporta el objeto 'ai' configurado para usarlo en otras partes
export {ai};
