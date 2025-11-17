/**
 * @fileoverview This file initializes the Genkit AI singleton and configures it with the Google AI plugin.
 * It also sets the model and embedding model to be used throughout the application.
 *
 * It exports a configured `ai` object.
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
  enableTracingAndMetrics: true,
});
