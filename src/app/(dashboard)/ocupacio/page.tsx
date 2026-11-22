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

interface Persona {
  id: string;
  nom: string;
  habitacio: string | null;
  entrada: string | null;
  sortida: string | null;
}

const dc = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '');

/**
 * Ocupació: un paràgraf per contracte, com el full a mà. Dalt, el període (any, trimestre,
 * mes o personalitzat); a sota, les persones que hi han estat, per triar quines surten al
 * full. De cada persona surt sempre tot l'historial, no només el del període.
 */
export default function OcupacioPage() {
  const avui = toISODate(new Date());
  const [estat, setEstat] = useState<EstatPeriode>({ tipus: 'mes', off: 0 });
  const { desde, fins } = rangDeEstat(estat, avui);
  const [persones, setPersones] = useState<Persona[]>([]);
  const [triades, setTriades] = useState<Set<string>>(new Set());
  const [carregant, setCarregant] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let viu = true;
    setCarregant(true);
    getJSON<Persona[]>(`/api/ocupacio/persones?desde=${desde}&fins=${fins}`)
      .then((r) => {
        if (!viu) return;
        setPersones(r);
        setTriades(new Set(r.map((p) => p.id)));
      })
      .catch(() => viu && setPersones([]))
      .finally(() => viu && setCarregant(false));
    return () => { viu = false; };
  }, [desde, fins]);

  const totes = persones.length > 0 && triades.size === persones.length;
  const url = useMemo(() => {
    const q = new URLSearchParams({ desde, fins });
    // Si no se'n tria cap, el full queda buit (no «totes»): es marca amb un id que no existeix.
    q.set('persones', triades.size ? [...triades].join(',') : '-');
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
            <CardTitle>Persones del període</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{carregant ? 'Carregant…' : `${triades.size} de ${persones.length} triades`}</span>
              <button
                type="button"
                className="font-semibold text-brand-700 hover:underline"
                onClick={() => setTriades(totes ? new Set() : new Set(persones.map((p) => p.id)))}
              >
                {totes ? 'Treu-les totes' : 'Tria-les totes'}
              </button>
            </div>
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto border border-slate-200">
              {persones.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={triades.has(p.id)} onChange={() => alterna(p.id)} className="mt-0.5 h-4 w-4 accent-brand-700" />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-800">{nomPropi(p.nom)}</span>
                      <span className="block text-xs text-slate-500">
                        {p.habitacio ? `Hab. ${p.habitacio} · ` : ''}{dc(p.entrada)} → {dc(p.sortida)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {!carregant && persones.length === 0 && <li className="px-3 py-4 text-sm text-slate-400">Ningú en aquest període.</li>}
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
