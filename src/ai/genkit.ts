/**
 * @fileoverview This file initializes the Genkit AI singleton and configures it with the Google AI plugin.
 *
 * It exports a configured `ai` object.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * The Gemini model used by every AI flow. Centralized here so switching models
 * (or adding a fallback) is a one-line change instead of editing each flow.
 */
export const GEMINI_MODEL = 'googleai/gemini-2.5-flash';

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
});
