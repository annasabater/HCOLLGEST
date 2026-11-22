'use client';

import { useMemo, useRef, useState } from 'react';
import { Printer, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { addDays, toISODate } from '@/lib/dates';

const mesos = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() + n); return toISODate(d); };

/** Ocupació: un paràgraf per contracte, com el full a mà. Només el període i imprimir / desar PDF. */
export default function OcupacioPage() {
  const avui = toISODate(new Date());
  const [desde, setDesde] = useState(avui);
  const [fins, setFins] = useState(mesos(2));
  const frame = useRef<HTMLIFrameElement>(null);

  const url = useMemo(() => `/imprimir/ocupacio?${new URLSearchParams({ desde, fins }).toString()}`, [desde, fins]);

  const imprimeix = () => {
    const w = frame.current?.contentWindow;
    if (w) { w.focus(); w.print(); }
  };
  const rang = (a: string, b: string) => { setDesde(a); setFins(b); };
  const finsMes = toISODate(addDays(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 0));

  return (
    <div>
      <PageHeader title="Ocupació" subtitle="Un paràgraf per contracte, amb els pagaments. Per imprimir o desar com a PDF." />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Des de"><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="Fins a"><Input type="date" value={fins} onChange={(e) => setFins(e.target.value)} /></Field>
        <Button type="button" variant="outline" onClick={() => rang(avui, finsMes)}>Aquest mes</Button>
        <Button type="button" variant="outline" onClick={() => rang(avui, mesos(2))}>Pròxims 2 mesos</Button>
        <Button type="button" variant="outline" onClick={() => rang(avui, mesos(3))}>Pròxims 3 mesos</Button>
        <div className="ml-auto flex gap-2">
          <Button type="button" onClick={imprimeix}><Printer className="h-4 w-4" /> Imprimir / desar PDF</Button>
          <a href={`${url}&auto=1`} target="_blank" rel="noreferrer" title="Obre el full en una pestanya nova">
            <Button type="button" variant="outline" aria-label="Obrir en una pestanya nova"><ExternalLink className="h-4 w-4" /></Button>
          </a>
        </div>
      </div>

      <div className="min-w-0 border border-slate-200 bg-slate-200/60 p-3">
        <iframe ref={frame} title="Full d'ocupació" src={url} className="block h-[85vh] w-full border-0" />
      </div>
    </div>
  );
}
