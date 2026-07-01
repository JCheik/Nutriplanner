export interface UnfilledSlot {
  day: string;
  mealTitle: string;
}

export interface AutocompleteToast {
  title: string;
  description: string;
  variant?: 'destructive';
}

/**
 * Builds the user-facing toast for an autocomplete run. `filledCount` slots got
 * a placement; `unfilled` lists the ones left empty because no eligible recipe
 * could hit the calorie target with a realistic whole number of servings.
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

  const names = unfilled.slice(0, 3).map(u => `${u.mealTitle} del ${u.day}`);
  const extra = unfilled.length > 3 ? ` y ${unfilled.length - 3} más` : '';
  const list = names.join(', ') + extra;

  if (filledCount === 0) {
    return {
      title: 'No pude completar la semana',
      description: `No encontré raciones enteras que encajaran en tu margen para: ${list}. Prueba con un margen más flexible o añade recetas variadas para esas comidas.`,
      variant: 'destructive',
    };
  }

  return {
    title: 'Semana autocompletada (con huecos)',
    description: `Rellené ${filledCount} de ${filledCount + unfilled.length} comidas. Para ${list} no encontré una ración entera dentro de tu margen — prueba con un margen más flexible o añade recetas variadas para esas comidas.`,
  };
}
