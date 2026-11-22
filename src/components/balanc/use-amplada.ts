'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Amplada en píxels real d'un contenidor (es refà en canviar la finestra). Els
 * gràfics SVG la fan servir com a amplada del seu viewBox: així el text es queda de
 * mida normal i l'alçada és la que toca, en lloc d'escalar-ho tot (que a una
 * pantalla ample feia els gràfics altíssims).
 */
export function useAmplada(minima = 560, inicial = 900) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mesura = () => setW(Math.max(minima, Math.floor(el.clientWidth)));
    mesura();
    const ro = new ResizeObserver(mesura);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minima]);
  return [ref, w] as const;
}
