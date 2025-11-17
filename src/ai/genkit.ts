'use server';

/**
 * @fileoverview This file initializes the Genkit AI singleton and configures it with the Google AI plugin.
 * It also sets the model and embedding model to be used throughout the application.
 *
 * It exports a configured `ai` object.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {configureGenkit} from 'genkit';

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const geminiPro = 'models/gemini-1.5-flash-latest';

export {genkit as ai};
