'use client';

import { useState } from 'react';

import { formatServings, parseServings } from '@/lib/serving-utils';

/**
 * El número de raciones, escribible. Los ± van rápido para 1, 2, 3, pero no
 * llegan a «0,2 raciones», así que el valor también se teclea.
 *
 * Lleva borrador propio: mientras se escribe NO se recorta ni se reformatea.
 * Sin eso no se puede llegar a «0,5» — al teclear el «0» se convertiría en el
 * mínimo y la coma nunca entraría. Se confirma al salir del campo o con Enter.
 */
export function ServingsField({
  value,
  onCommit,
  className,
  ariaLabel,
}: {
  value: number;
  onCommit: (n: number) => void;
  className?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? formatServings(value)}
      onFocus={(e) => {
        setDraft(formatServings(value));
        e.currentTarget.select();
      }}
      onChange={(e) => {
        // Solo dígitos y UN separador: con dos comas `parseFloat` se quedaría
        // con lo de delante sin avisar.
        const clean = e.target.value.replace(/[^0-9.,]/g, '').replace(/([.,])(?=.*[.,])/g, '');
        setDraft(clean);
        // Se confirma en cada tecla, no al salir del campo: si se teclean las
        // raciones y se cierra el diálogo de golpe, con el blur se perderían.
        // Un campo vacío o ilegible deja las raciones como estaban.
        const parsed = parseServings(clean);
        if (parsed !== null) onCommit(parsed);
      }}
      // El blur solo limpia el borrador para que se repinte ya formateado.
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
