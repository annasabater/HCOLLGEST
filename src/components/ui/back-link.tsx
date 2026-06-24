'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * Enllaç de "tornar enrere": torna a la pàgina d'on véns (historial del
 * navegador). Si has obert la pàgina directament (sense historial dins l'app),
 * va al destí de reserva `fallback`.
 */
export function BackLink({ fallback, children }: { fallback: string; children: React.ReactNode }) {
  const router = useRouter();
  function back() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(fallback);
  }
  return (
    <button
      type="button"
      onClick={back}
      className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
    >
      <ArrowLeft className="h-4 w-4" /> {children}
    </button>
  );
}
