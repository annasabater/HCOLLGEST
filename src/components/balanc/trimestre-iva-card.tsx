'use client';

import { useEffect, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavegadorPeriode } from '@/components/ui/navegador-periode';
import { getJSON } from '@/lib/api';
import { toISODate } from '@/lib/dates';
import { rangPeriode, type EstatPeriode } from '@/lib/periode';
import { Eur } from '@/components/finances/amounts-visibility';

interface Desat { periode: string; etiqueta: string; totalTotal: number; updatedAt: string }

/**
 * Navegador de trimestres (‹ ›) que obre el llibre d'IVA (ingressos) imprimible i
 * EDITABLE, i el registre dels trimestres ja desats. De moment només ingressos.
 */
export function TrimestreIvaCard() {
  const avui = toISODate(new Date());
  const [estat, setEstat] = useState<EstatPeriode>({ tipus: 'tri', off: 0 });
  const { any, trimestre: trim } = rangPeriode('tri', estat.tipus === 'tri' ? estat.off : 0, avui);
  const [desats, setDesats] = useState<Desat[]>([]);

  useEffect(() => {
    getJSON<{ desats: Desat[] }>('/api/llibre-iva').then((r) => setDesats(r.desats)).catch(() => {});
  }, []);

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <FileText className="h-4 w-4 text-brand-600" /> Llibre d&apos;IVA trimestral (ingressos)
        </span>
        <NavegadorPeriode
          className="bg-transparent px-0 py-0"
          estat={estat}
          onChange={setEstat}
          avui={avui}
          tipus={['tri']}
        />
        <a href={`/imprimir/trimestre-ingressos/${any}-${trim}`} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            <FileText className="h-4 w-4" /> Obrir / editar / imprimir
          </Button>
        </a>
      </div>

      {desats.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Save className="h-3.5 w-3.5" /> Llibres desats
          </p>
          <div className="flex flex-wrap gap-2">
            {desats.map((d) => (
              <a
                key={d.periode}
                href={`/imprimir/trimestre-ingressos/${d.periode}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:border-brand-300 hover:bg-brand-50"
                title={`Desat el ${new Date(d.updatedAt).toLocaleDateString('ca-ES')}`}
              >
                <span className="font-medium text-slate-700">{d.etiqueta}</span>
                <Eur value={d.totalTotal} className="text-slate-400" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
