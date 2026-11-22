'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BARRA_COOKIE, ESTIL_COOKIE, type Barra, type Estil } from '@/lib/estil';

const OPCIONS: { id: Estil; nom: string; desc: string }[] = [
  { id: 'original', nom: 'Original', desc: 'Com sempre: arrodonit, barra lateral granat.' },
  { id: 'nou', nom: 'Nou', desc: 'Quadrat i net, amb els grisos de la web.' },
];

// Mostra petita de cada barra (fons, text, l'opció on ets).
const BARRES: { id: Barra; nom: string; desc: string; fons: string; text: string; actiuFons: string; actiuText: string; vora: string }[] = [
  { id: 'clara', nom: 'Barra clara', desc: 'Blanca amb vora; l’opció on ets, en rosat.', fons: '#ffffff', text: '#3a3632', actiuFons: '#f6ecee', actiuText: '#7a1f2b', vora: '#7a1f2b' },
  { id: 'granat', nom: 'Barra granat', desc: 'Tota granat fosc; l’opció on ets, en crema.', fons: '#5c1620', text: '#f5efe6', actiuFons: '#f5efe6', actiuText: '#5c1620', vora: '#f5efe6' },
];

const UN_ANY = 'path=/; max-age=31536000; samesite=lax';

/** Tria l'estil visual (i, amb el nou, la barra lateral). Es desa en aquest navegador. */
export function EstilConfig({ actual, barraActual }: { actual: Estil; barraActual: Barra }) {
  const router = useRouter();
  const [estil, setEstil] = useState<Estil>(actual);
  const [barra, setBarra] = useState<Barra>(barraActual);

  function tria(e: Estil) {
    setEstil(e);
    // Un any; es llegeix al servidor (layout) perquè no parpellegi en carregar.
    document.cookie = `${ESTIL_COOKIE}=${e}; ${UN_ANY}`;
    document.documentElement.dataset.estil = e;
    router.refresh();
  }

  function triaBarra(b: Barra) {
    setBarra(b);
    document.cookie = `${BARRA_COOKIE}=${b}; ${UN_ANY}`;
    document.documentElement.dataset.barra = b;
    router.refresh();
  }

  const targeta = (actiu: boolean) =>
    cn(
      'rounded-lg border p-4 text-left transition-colors',
      actiu ? 'border-brand-700 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300',
    );

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Estil visual" className="grid gap-3 sm:grid-cols-2">
        {OPCIONS.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={estil === o.id} onClick={() => tria(o.id)} className={targeta(estil === o.id)}>
            <span className="block font-semibold text-slate-900">
              {o.nom}
              {estil === o.id && <span className="ml-2 text-xs font-medium text-brand-700">· actiu</span>}
            </span>
            <span className="mt-0.5 block text-sm text-slate-500">{o.desc}</span>
          </button>
        ))}
      </div>

      {estil === 'nou' && (
        <div className="space-y-2">
          <p className="ui-label text-sm font-medium text-slate-700">Barra lateral</p>
          <div role="radiogroup" aria-label="Barra lateral" className="grid gap-3 sm:grid-cols-2">
            {BARRES.map((b) => (
              <button key={b.id} type="button" role="radio" aria-checked={barra === b.id} onClick={() => triaBarra(b.id)} className={cn(targeta(barra === b.id), 'flex items-center gap-4')}>
                {/* Mostra: tres línies de menú i l'opció on ets. */}
                <span aria-hidden="true" className="flex w-24 shrink-0 flex-col gap-1 border border-slate-200 px-0 py-2" style={{ background: b.fons }}>
                  <span className="mx-2 h-1.5 w-12" style={{ background: b.text, opacity: 0.7 }} />
                  <span className="flex h-4 items-center" style={{ background: b.actiuFons, boxShadow: `inset 3px 0 0 ${b.vora}` }}>
                    <span className="mx-2 h-1.5 w-10" style={{ background: b.actiuText }} />
                  </span>
                  <span className="mx-2 h-1.5 w-14" style={{ background: b.text, opacity: 0.7 }} />
                  <span className="mx-2 h-1.5 w-9" style={{ background: b.text, opacity: 0.7 }} />
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">
                    {b.nom}
                    {barra === b.id && <span className="ml-2 text-xs font-medium text-brand-700">· activa</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500">{b.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Es desa en aquest navegador: a cada ordinador o mòbil el pots triar per separat. Només canvia l’aspecte, no les dades.
      </p>
    </div>
  );
}
