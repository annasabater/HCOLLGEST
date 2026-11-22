'use client';

import { useMemo, useRef, useState } from 'react';
import { Printer, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { addDays, toISODate } from '@/lib/dates';
import { cn } from '@/lib/utils';

type Acabades = 'amaga' | 'ratlla';
type Orient = 'v' | 'h';

const mesos = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() + n); return toISODate(d); };

function Casella({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand-700" />
      {children}
    </label>
  );
}

function Segmentat<T extends string>({ valor, onChange, opcions }: { valor: T; onChange: (v: T) => void; opcions: { v: T; l: string }[] }) {
  return (
    <div role="group" className="inline-flex border border-slate-200 bg-white text-sm">
      {opcions.map((o, i) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={valor === o.v}
          onClick={() => onChange(o.v)}
          className={cn('px-3 py-1.5 font-semibold', i > 0 && 'border-l border-slate-200', valor === o.v ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-50')}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

/** Ocupació: qui hi ha a cada habitació i fins quan. Es pot imprimir o desar com a PDF. */
export default function OcupacioPage() {
  const avui = toISODate(new Date());
  const [desde, setDesde] = useState(avui);
  const [fins, setFins] = useState(mesos(2));
  const [tel, setTel] = useState(true);
  const [imp, setImp] = useState(true);
  const [met, setMet] = useState(true);
  const [pag, setPag] = useState(false);
  const [notes, setNotes] = useState(false);
  const [blancs, setBlancs] = useState(true);
  const [acabades, setAcabades] = useState<Acabades>('amaga');
  const [orient, setOrient] = useState<Orient>('v');
  const frame = useRef<HTMLIFrameElement>(null);

  const url = useMemo(() => {
    const q = new URLSearchParams({
      desde, fins, tel: tel ? '1' : '0', imp: imp ? '1' : '0', met: met ? '1' : '0', pag: pag ? '1' : '0',
      notes: notes ? '1' : '0', blancs: blancs ? '2' : '0', acabades, orient,
    });
    return `/imprimir/ocupacio?${q.toString()}`;
  }, [desde, fins, tel, imp, met, pag, notes, blancs, acabades, orient]);

  const imprimeix = () => {
    const w = frame.current?.contentWindow;
    if (w) { w.focus(); w.print(); }
  };

  const rang = (a: string, b: string) => { setDesde(a); setFins(b); };

  return (
    <div>
      <PageHeader title="Ocupació" subtitle="Qui hi ha a cada habitació i fins quan. Per imprimir o desar com a PDF." />

      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Període</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Des de"><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
                <Field label="Fins a"><Input type="date" value={fins} onChange={(e) => setFins(e.target.value)} /></Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => rang(avui, toISODate(addDays(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 0)))}>Aquest mes</Button>
                <Button type="button" variant="outline" onClick={() => rang(avui, mesos(2))}>Pròxims 2 mesos</Button>
                <Button type="button" variant="outline" onClick={() => rang(avui, mesos(3))}>Pròxims 3 mesos</Button>
                <Button type="button" variant="outline" onClick={() => rang(`${new Date().getFullYear()}-01-01`, `${new Date().getFullYear()}-12-31`)}>Tot l&apos;any</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Què es veu al full</CardTitle></CardHeader>
            <CardBody className="space-y-2.5">
              <Casella checked={tel} onChange={setTel}>Telèfon</Casella>
              <Casella checked={imp} onChange={setImp}>Import</Casella>
              <Casella checked={met} onChange={setMet}>Mètode de pagament</Casella>
              <Casella checked={pag} onChange={setPag}>Pagat / pendent</Casella>
              <Casella checked={notes} onChange={setNotes}>Notes de l&apos;estada</Casella>
              <Casella checked={blancs} onChange={setBlancs}>Línies en blanc per escriure a mà <span className="text-slate-400">(2 per habitació)</span></Casella>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Estades ja acabades</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              <Segmentat valor={acabades} onChange={setAcabades} opcions={[{ v: 'amaga', l: 'Amagades' }, { v: 'ratlla', l: 'Ratllades' }]} />
              <p className="text-xs text-slate-500">«Ratllades» les deixa al full amb una ratlla al damunt, com ho feies a mà.</p>
            </CardBody>
          </Card>

          <div className="space-y-2">
            <Segmentat valor={orient} onChange={setOrient} opcions={[{ v: 'v', l: 'A4 vertical' }, { v: 'h', l: 'A4 apaïsat' }]} />
            <div className="flex gap-2">
              <Button type="button" className="flex-1" onClick={imprimeix}><Printer className="h-4 w-4" /> Imprimir / desar PDF</Button>
              <a href={`${url}&auto=1`} target="_blank" rel="noreferrer" title="Obre el full en una pestanya nova">
                <Button type="button" variant="outline" aria-label="Obrir en una pestanya nova"><ExternalLink className="h-4 w-4" /></Button>
              </a>
            </div>
            <p className="text-xs text-slate-500">En el diàleg d&apos;impressió, tria «Desa com a PDF» com a impressora per baixar-lo.</p>
          </div>
        </div>

        <div className="min-w-0 border border-slate-200 bg-slate-200/60 p-3">
          <iframe
            ref={frame}
            key={orient}
            title="Full d'ocupació"
            src={url}
            className="block h-[85vh] w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
