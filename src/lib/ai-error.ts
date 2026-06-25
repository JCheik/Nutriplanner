/**
 * Returns a user-friendly message for Genkit/Gemini API errors.
 * Detects transient saturation (503) and quota (429) errors so the user
 * knows to retry rather than reporting a bug.
 */
export function getAiErrorMessage(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (/UNAVAILABLE|503|high demand/i.test(msg)) {
    return 'El modelo de IA está saturado en este momento. Espera unos segundos e inténtalo de nuevo.';
  }

  if (/RESOURCE_EXHAUSTED|429|quota/i.test(msg)) {
    const seconds = msg.match(/retry in ([\d.]+)s/i)?.[1];
    return seconds
      ? `Demasiadas peticiones. Inténtalo de nuevo en ${Math.ceil(Number(seconds))} segundos.`
      : 'Demasiadas peticiones a la IA. Espera un momento e inténtalo de nuevo.';
  }

  // Missing/invalid API key: not something the user can retry away — surface it
  // clearly so it's obvious the server is misconfigured (no GEMINI_API_KEY).
  if (/API[_ ]?key|API_KEY_INVALID|PERMISSION_DENIED|401|403|invalid authentication/i.test(msg)) {
    return 'El servicio de IA no está configurado correctamente (clave de API ausente o inválida). Contacta con el administrador.';
  }

  return fallback;
}

/** Returns true if the error is a transient AI error the user can retry. */
export function isRetryableAiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /UNAVAILABLE|503|high demand|RESOURCE_EXHAUSTED|429|quota/i.test(msg);
}
