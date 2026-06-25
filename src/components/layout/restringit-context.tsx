'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Indica si el compte actual té "vista restringida de propietat"
 * (hcoll@gmail.com). Serveix perquè els components CLIENT (plantilles, balanç…)
 * puguin amagar mòduls/figures sensibles sense una crida extra al servidor.
 */
const RestringitContext = createContext(false);

export function RestringitProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <RestringitContext.Provider value={value}>{children}</RestringitContext.Provider>;
}

export function useRestringit(): boolean {
  return useContext(RestringitContext);
}
