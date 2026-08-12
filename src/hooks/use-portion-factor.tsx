'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * El tamaño de plato del usuario, disponible en todo el árbol.
 *
 * Es estado ambiental —un ajuste del perfil que se lee en la tarjeta de receta,
 * en la ficha, en el modo cocina y en el cuadrante— y pasarlo como prop obligaba
 * a atravesar seis componentes que no tienen nada que ver con él. Quien decide
 * cuánto vale es `useUserProfileState`; aquí solo se reparte.
 *
 * Por defecto 1: sin objetivo guardado no hay a qué ajustar, y las recetas se
 * muestran tal cual están escritas.
 */
const PortionFactorContext = createContext(1);

export function PortionFactorProvider({ value, children }: { value: number; children: ReactNode }) {
  return <PortionFactorContext.Provider value={value}>{children}</PortionFactorContext.Provider>;
}

export function usePortionFactor(): number {
  return useContext(PortionFactorContext);
}
