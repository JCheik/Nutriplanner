/**
 * Motivo por el que un hueco se quedó vacío. Lo decide `autocomplete-flow` en
 * el momento de descartarlo; aquí solo se traduce a algo que el usuario pueda
 * accionar.
 */
export type UnfilledReason = 'sin_recetas' | 'tope_repeticion' | 'margen_calorico';

export interface UnfilledSlot {
  day: string;
  mealId: string;
  mealTitle: string;
  reason: UnfilledReason;
}

export interface AutocompleteToast {
  title: string;
  description: string;
  variant?: 'destructive';
}

/**
 * Qué hacer con cada motivo. El consejo importa tanto como la causa: durante un
 * tiempo TODOS los huecos se explicaban con "prueba con un margen más flexible",
 * que solo arregla uno de los tres — al usuario sin recetas de cena le mandaba a
 * tocar justo donde no era.
 *
 * `short` es lo que se enseña dentro del hueco, en el cuadrante, donde no caben
 * más de dos o tres palabras.
 */
const REASONS: Record<UnfilledReason, { short: string; explain: (n: number) => string }> = {
  sin_recetas: {
    short: 'Sin recetas para esta comida',
    explain: (n) =>
      n === 1
        ? 'no tienes ninguna receta que encaje con ese tipo de comida. Añade alguna al recetario, o etiqueta las que ya tienes con esa categoría.'
        : 'no tienes recetas que encajen con ese tipo de comida. Añade alguna al recetario, o etiqueta las que ya tienes con esa categoría.',
  },
  tope_repeticion: {
    short: 'Tope de repeticiones alcanzado',
    explain: () =>
      'las recetas que encajaban ya estaban puestas el máximo de veces que permites repetir. Sube el límite de repeticiones o añade más variedad para esas comidas.',
  },
  margen_calorico: {
    short: 'Ninguna cuadra con las calorías',
    explain: () =>
      'hay recetas, pero ninguna cuadra con las calorías del hueco en raciones enteras. Amplía el margen calórico o añade recetas de otro tamaño.',
  },
};

/** "Cena del Lunes, Comida del Martes y 2 más" */
function listSlots(slots: UnfilledSlot[]): string {
  const names = slots.slice(0, 3).map((u) => `${u.mealTitle} del ${u.day}`);
  const extra = slots.length > 3 ? ` y ${slots.length - 3} más` : '';
  return names.join(', ') + extra;
}

/** Agrupa por motivo, en el orden en que conviene leerlos (el más común primero). */
function byReason(unfilled: UnfilledSlot[]): { reason: UnfilledReason; slots: UnfilledSlot[] }[] {
  const order: UnfilledReason[] = ['sin_recetas', 'tope_repeticion', 'margen_calorico'];
  return order
    .map((reason) => ({ reason, slots: unfilled.filter((u) => u.reason === reason) }))
    .filter((g) => g.slots.length > 0)
    .sort((a, b) => b.slots.length - a.slots.length);
}

/** Texto corto para marcar el hueco en el cuadrante. */
export function unfilledReasonLabel(reason: UnfilledReason): string {
  return REASONS[reason].short;
}

/**
 * Builds the user-facing toast for an autocomplete run. `filledCount` slots got
 * a placement; `unfilled` lists the ones left empty, cada uno con su motivo.
 */
export function autocompleteToast(filledCount: number, unfilled: UnfilledSlot[]): AutocompleteToast {
  // Nothing to do: no empty slots and nothing skipped.
  if (filledCount === 0 && unfilled.length === 0) {
    return {
      title: 'Todo listo',
      description: 'No había comidas vacías que rellenar en tu plan.',
    };
  }

  if (unfilled.length === 0) {
    return {
      title: 'Semana autocompletada',
      description: 'Se han rellenado los huecos vacíos de tu planificador.',
    };
  }

  const groups = byReason(unfilled);

  // Un solo motivo: se explica en una frase, nombrando los huecos.
  const detail =
    groups.length === 1
      ? `Para ${listSlots(groups[0].slots)} ${REASONS[groups[0].reason].explain(groups[0].slots.length)}`
      : // Varios motivos: uno por línea, con el número de huecos delante. Nombrar
        // los siete huecos de tres grupos distintos no cabe y no se lee.
        groups
          .map((g) => `· ${g.slots.length} ${g.slots.length === 1 ? 'hueco' : 'huecos'}: ${REASONS[g.reason].explain(g.slots.length)}`)
          .join('\n');

  if (filledCount === 0) {
    return {
      title: 'No pude completar la semana',
      description: detail,
      variant: 'destructive',
    };
  }

  return {
    title: 'Semana autocompletada (con huecos)',
    description: `Rellené ${filledCount} de ${filledCount + unfilled.length} comidas.\n${detail}`,
  };
}
