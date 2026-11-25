'use client';

import { usePathname } from 'next/navigation';
import { apartatDe } from '@/components/layout/sidebar';

/**
 * Pretítol de la capçalera de pàgina: petit, granat i en majúscules. Si no se'n
 * dona cap, és l'apartat de la barra lateral on és la pàgina (Recepció, Gestió…).
 */
export function Pretitol({ text }: { text?: string }) {
  const pathname = usePathname();
  const t = text ?? apartatDe(pathname);
  if (!t) return null;
  return <p className="ui-pretitol mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">{t}</p>;
}
