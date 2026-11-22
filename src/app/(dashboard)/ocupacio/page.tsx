'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodeEnLinia } from '@/components/ui/navegador-periode';
import { getJSON } from '@/lib/api';
import { toISODate } from '@/lib/dates';
import { rangDeEstat, type EstatPeriode } from '@/lib/periode';
import { nomPropi } from '@/lib/nom-propi';

interface Estada {
  clau: string;
  numero: string | null;
  habitacions: string[];
  persones: string[];
  del: string | null;
  al: string | null;
  trams: number;
}

const dc = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '');

/**
 * Ocupació: un paràgraf per contracte, com el full a mà. Dalt, el període (any, trimestre,
 * mes o personalitzat); a sota, les estades (contractes) de les persones que hi han estat,
 * amb tot el seu historial, per triar quines surten al full.
 */
export default function OcupacioPage() {
  const avui = toISODate(new Date());
  const [estat, setEstat] = useState<EstatPeriode>({ tipus: 'mes', off: 0 });
  const { desde, fins } = rangDeEstat(estat, avui);
  const [estades, setEstades] = useState<Estada[]>([]);
  const [triades, setTriades] = useState<Set<string>>(new Set());
  const [carregant, setCarregant] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let viu = true;
    setCarregant(true);
    getJSON<Estada[]>(`/api/ocupacio/contractes?desde=${desde}&fins=${fins}`)
      .then((r) => {
        if (!viu) return;
        setEstades(r);
        setTriades(new Set(r.map((x) => x.clau)));
      })
      .catch(() => viu && setEstades([]))
      .finally(() => viu && setCarregant(false));
    return () => { viu = false; };
  }, [desde, fins]);

  const totes = estades.length > 0 && triades.size === estades.length;
  const url = useMemo(() => {
    const q = new URLSearchParams({ desde, fins });
    // Si no se'n tria cap, el full queda buit (no «totes»): es marca amb un id que no existeix.
    q.set('contractes', triades.size ? [...triades].join(',') : '-');
    return `/imprimir/ocupacio?${q.toString()}`;
  }, [desde, fins, triades]);

  const imprimeix = () => {
    const w = frame.current?.contentWindow;
    if (w) { w.focus(); w.print(); }
  };
  const alterna = (id: string) =>
    setTriades((t) => { const n = new Set(t); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div>
      <PageHeader
        title="Ocupació"
        subtitle="Un paràgraf per contracte, amb els pagaments. Per imprimir o desar com a PDF."
        actions={
          <div className="flex gap-2">
            <Button type="button" onClick={imprimeix} disabled={triades.size === 0}><Printer className="h-4 w-4" /> Imprimir / desar PDF</Button>
            <a href={`${url}&auto=1`} target="_blank" rel="noreferrer" title="Obre el full en una pestanya nova">
              <Button type="button" variant="outline" aria-label="Obrir en una pestanya nova"><ExternalLink className="h-4 w-4" /></Button>
            </a>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PeriodeEnLinia estat={estat} onChange={setEstat} avui={avui} primerDia="2000-01-01" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Estades del període</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{carregant ? 'Carregant…' : `${triades.size} de ${estades.length} triades`}</span>
              <button
                type="button"
                className="font-semibold text-brand-700 hover:underline"
                onClick={() => setTriades(totes ? new Set() : new Set(estades.map((x) => x.clau)))}
              >
                {totes ? 'Treu-les totes' : 'Tria-les totes'}
              </button>
            </div>
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto border border-slate-200">
              {estades.map((x) => (
                <li key={x.clau}>
                  <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={triades.has(x.clau)} onChange={() => alterna(x.clau)} className="mt-0.5 h-4 w-4 accent-brand-700" />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-800">{x.persones.map(nomPropi).join(', ')}</span>
                      <span className="block text-xs text-slate-500">
                        {x.numero ? `Contracte ${x.numero}` : 'Sense contracte'}
                        {x.habitacions.length ? ` · Hab. ${x.habitacions.join('/')}` : ''} · {dc(x.del)} → {dc(x.al)}
                        {x.trams > 1 ? ` · ${x.trams - 1} ${x.trams === 2 ? 'ampliació' : 'ampliacions'}` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {!carregant && estades.length === 0 && <li className="px-3 py-4 text-sm text-slate-400">Cap estada en aquest període.</li>}
            </ul>
          </CardBody>
        </Card>

        <div className="min-w-0 border border-slate-200 bg-slate-200/60 p-3">
          <iframe ref={frame} title="Full d'ocupació" src={url} className="block h-[85vh] w-full border-0" />
        </div>
      </div>
    </div>
  );
}
