/**
 * Splits a recipe's free-form instructions into discrete steps for the cooking
 * checklist. Recipes — especially AI-generated ones — don't always separate
 * steps with newlines: some return a single paragraph with inline numbering
 * ("1. … 2. …"), others one block of sentences. This normalises all of those
 * into a clean list, stripping any leading step numbers so the checklist reads
 * cleanly.
 */
export function splitInstructionSteps(instructions: string): string[] {
  if (!instructions) return [];

  // Remove a leading "1." / "2)" / "3 -" marker from a step.
  const stripNumber = (s: string) => s.replace(/^\s*\d+\s*[.)\-–]\s*/, '').trim();
  const clean = (arr: string[]) => arr.map(stripNumber).filter(Boolean);

  // 1) Preferred: explicit line breaks.
  const byLine = instructions
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byLine.length > 1) return clean(byLine);

  const single = (byLine[0] ?? instructions).trim();

  // 2) Inline numbering within one block: "1. … 2. … 3. …".
  //    Split right before a number followed by . ) or - and whitespace.
  //    Requiring trailing whitespace avoids splitting decimals like "1.5 l".
  const byNumber = single
    .split(/\s*(?=\d+\s*[.)\-–]\s+)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byNumber.length > 1) return clean(byNumber);

  // 3) Last resort: sentence boundaries (.!? followed by a capital letter).
  const bySentence = single
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (bySentence.length > 1) return clean(bySentence);

  // Single step.
  return clean([single]);
}
