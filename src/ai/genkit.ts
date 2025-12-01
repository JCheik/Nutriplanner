/**
 * @fileoverview This file initializes the Genkit AI singleton and configures it with the Google AI plugin.
 *
 * It exports a configured `ai` object.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});
