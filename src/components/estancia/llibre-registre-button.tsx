'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { patchJSON } from '@/lib/api';
import { formatDate } from '@/lib/utils';

/**
 * Botó «Llibre registre» de l'estada amb l'estat d'impressió:
 *  - per imprimir → pintat de taronja amb «PER IMPRIMIR»; en obrir-lo pregunta
 *    al costat (sense finestra) «L'has imprès? Sí / Encara no»;
 *  - imprès → botó normal amb «✓ Imprès» i «Desfer» per si t'has equivocat.
 * Sense `gestiona` (comptes de només lectura, esborranys…) és el botó de sempre.
 */
export function LlibreRegistreButton({
  estanciaId,
  href,
  impresEl,
  perImprimir,
  gestiona,
}: {
  estanciaId: string;
  href: string;
  impresEl: string | null;
  perImprimir: boolean;
  gestiona: boolean;
}) {
  const router = useRouter();
  const [pregunta, setPregunta] = useState(false);
  const [desant, setDesant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function marca(impres: boolean) {
    setDesant(true);
    setError(null);
    try {
      await patchJSON(`/api/estancies/${estanciaId}`, { llibreImpres: impres });
      setPregunta(false);
      router.refresh();
    } catch {
      setError('No s’ha pogut desar');
    } finally {
      setDesant(false);
    }
  }

  if (!gestiona) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        <Button variant="outline">
          <BookText className="h-4 w-4" /> Llibre registre
        </Button>
      </a>
    );
  }

  if (!perImprimir) {
    return (
      <span className="inline-flex items-center gap-1">
        <a href={href} target="_blank" rel="noreferrer">
          <Button variant="outline" title={impresEl ? `Marcat com a imprès el ${formatDate(impresEl)}` : undefined}>
            <BookText className="h-4 w-4" /> Llibre registre
            <span className="ml-1 inline-flex items-center gap-1 border-l border-slate-200 pl-2 text-xs font-semibold text-green-700">
              <Check className="h-3.5 w-3.5" /> Imprès
            </span>
          </Button>
        </a>
        <button
          type="button"
          onClick={() => marca(false)}
          disabled={desant}
          title="Torna’l a posar «per imprimir»"
          className="px-1.5 text-xs text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
        >
          Desfer
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a href={href} target="_blank" rel="noreferrer" onClick={() => setPregunta(true)}>
        <Button
          variant="outline"
          className="border-2 border-amber-600 bg-amber-50 font-semibold text-amber-900 hover:bg-amber-100"
        >
          <BookText className="h-4 w-4 text-amber-700" /> Llibre registre
          {!pregunta && (
            <span className="ml-1 bg-amber-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Per imprimir
            </span>
          )}
        </Button>
      </a>
      {pregunta ? (
        <span className="inline-flex flex-wrap items-center gap-2 border border-amber-300 bg-amber-50/60 py-1 pl-3 pr-1">
          <span className="text-sm font-semibold text-amber-900">L’has imprès?</span>
          <Button size="sm" onClick={() => marca(true)} disabled={desant} className="bg-green-700 text-white hover:bg-green-800">
            <Check className="h-4 w-4" /> Sí
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPregunta(false)} disabled={desant}>
            Encara no
          </Button>
        </span>
      ) : (
        // Per si l'has imprès per una altra banda (o sense obrir-lo des d'aquí).
        <button
          type="button"
          onClick={() => setPregunta(true)}
          className="text-xs text-amber-800 underline hover:text-amber-950"
        >
          Ja l’he imprès
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
