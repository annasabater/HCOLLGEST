'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ESTIL_COOKIE, type Estil } from '@/lib/estil';

const OPCIONS: { id: Estil; nom: string; desc: string }[] = [
  { id: 'original', nom: 'Original', desc: 'Com sempre: arrodonit, barra lateral granat.' },
  { id: 'nou', nom: 'Nou', desc: 'Quadrat i net, amb els grisos de la web i la barra lateral clara.' },
];

/** Tria l'estil visual. Es desa en aquest navegador (cada dispositiu tria el seu). */
export function EstilConfig({ actual }: { actual: Estil }) {
  const router = useRouter();
  const [estil, setEstil] = useState<Estil>(actual);

  function tria(e: Estil) {
    setEstil(e);
    // Un any; es llegeix al servidor (layout) perquè no parpellegi en carregar.
    document.cookie = `${ESTIL_COOKIE}=${e}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.estil = e;
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Estil visual" className="grid gap-3 sm:grid-cols-2">
        {OPCIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={estil === o.id}
            onClick={() => tria(o.id)}
            className={cn(
              'rounded-lg border p-4 text-left transition-colors',
              estil === o.id ? 'border-brand-700 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300',
            )}
          >
            <span className="block font-semibold text-slate-900">
              {o.nom}
              {estil === o.id && <span className="ml-2 text-xs font-medium text-brand-700">· actiu</span>}
            </span>
            <span className="mt-0.5 block text-sm text-slate-500">{o.desc}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Es desa en aquest navegador: a cada ordinador o mòbil el pots triar per separat. Només canvia l’aspecte, no les dades.
      </p>
    </div>
  );
}
