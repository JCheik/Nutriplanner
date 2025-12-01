/**
 * @fileoverview Este archivo inicializa la configuración de Genkit
 * con el plugin de Google AI y exporta el objeto 'ai' configurado.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});
