/**
 * @fileoverview This file initializes the Genkit AI singleton and configures it with the Google AI plugin.
 *
 * It exports a configured `ai` object.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Modelo por defecto de los flujos de IA.
 *
 * Se salió de `gemini-2.5-flash` el 2026-08-09: Google retira los 2.5 el
 * **16 de octubre de 2026** y habría dejado de funcionar en plena alfa.
 *
 * Aquí va el bueno, para lo que se nota en pantalla: importar una receta de un
 * vídeo, inventarla, leer la foto de la nevera y entender lo que se le pide al
 * asistente. Si estos fallan, el usuario ve una receta mal.
 */
export const GEMINI_MODEL = 'googleai/gemini-3.5-flash';

/**
 * Modelo del autocompletado, que es el que más se usa y el que más prompt
 * manda (con 100 recetas son ~15.000 tokens de entrada por pasada).
 *
 * Va con el barato a propósito, y no es un recorte a ciegas: en ese flujo el
 * modelo casi no decide. La pasada determinista de `autocomplete-flow` valida
 * la elegibilidad, impone el tope de repeticiones, coloca los platos fijos y
 * elige por ajuste calórico. El modelo aporta una preferencia que el código
 * revisa entera después.
 *
 * Medido con el prompt real: `3.5-flash` gasta ~1.600 tokens de razonamiento
 * (facturados a $9/M) en una petición mínima; `3.1-flash-lite` gasta 0, y los
 * dos devuelven JSON válido eligiendo solo recetas elegibles. Sale ~12 veces
 * más barato que 3.5 y por debajo incluso de lo que costaba el 2.5.
 */
export const GEMINI_MODEL_BULK = 'googleai/gemini-3.1-flash-lite';

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
});
