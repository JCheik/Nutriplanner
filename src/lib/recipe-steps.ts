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

export interface StepDuration {
  /** Timer length in seconds. For a range ("8-10 min") uses the lower bound. */
  seconds: number;
  /** The text detected in the step, e.g. "8-10 minutos". */
  label: string;
}

/**
 * Finds cooking durations mentioned in a step ("hornea 20 minutos", "8-10 min",
 * "1 hora y media", "media hora", "30 segundos") so the cooking mode can offer
 * a ready-made timer per step. Ranges use the lower bound: better to check
 * early and keep cooking than to overshoot. Returns at most 3 per step.
 */
export function parseStepDurations(step: string): StepDuration[] {
  if (!step) return [];
  const found: (StepDuration & { index: number })[] = [];
  let text = step;

  // Each matched span is blanked out so a later, broader pattern can't
  // re-match part of it ("2 horas y media" must not also yield "2 horas").
  const consume = (re: RegExp, toSeconds: (m: RegExpExecArray) => number) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const seconds = Math.round(toSeconds(m));
      if (seconds >= 5 && seconds <= 24 * 3600) {
        found.push({ seconds, label: m[0].trim().replace(/\s+/g, ' '), index: m.index });
      }
      text = text.slice(0, m.index) + ' '.repeat(m[0].length) + text.slice(m.index + m[0].length);
    }
  };

  // "2 horas y media", "hora y media", "media hora"
  consume(/(\d+)\s*horas?\s*y\s*media/gi, (m) => Number(m[1]) * 3600 + 1800);
  consume(/\bhora y media\b/gi, () => 5400);
  consume(/\bmedia hora\b/gi, () => 1800);

  // Ranges and single values: "8-10 minutos", "10 min", "2 h", "30 segundos".
  // Bare "m"/"s" units are deliberately not matched (too ambiguous in prose).
  consume(
    /(\d+(?:[.,]\d+)?)(?:\s*(?:a|-|–|—)\s*(\d+(?:[.,]\d+)?))?\s*(horas?|hrs?\b|h\b|minutos?|mins?\b|min\.|segundos?|seg\b|sg\b)/gi,
    (m) => {
      const first = Number(m[1].replace(',', '.'));
      const second = m[2] !== undefined ? Number(m[2].replace(',', '.')) : first;
      const value = Math.min(first, second);
      const unit = m[3].toLowerCase();
      const factor = unit.startsWith('h') ? 3600 : /^(seg|sg)/.test(unit) ? 1 : 60;
      return value * factor;
    }
  );

  return found
    .sort((a, b) => a.index - b.index)
    .slice(0, 3)
    .map(({ seconds, label }) => ({ seconds, label }));
}
