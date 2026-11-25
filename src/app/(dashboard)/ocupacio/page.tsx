'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, ExternalLink, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodeEnLinia } from '@/components/ui/navegador-periode';
import { getJSON } from '@/lib/api';
import { toISODate } from '@/lib/dates';
import { rangDeEstat, type EstatPeriode } from '@/lib/periode';
import { nomPropi } from '@/lib/nom-propi';
import { classePdf } from '@/components/ui/boto-pdf';

interface Estada {
  clau: string;
  numero: string | null;
  habitacions: string[];
  persones: string[];
  del: string | null;
  al: string | null;
  trams: number;
  /** Encara no ha entrat (reserva, hagi pagat o no). */
  reserva: boolean;
}

const LS_ESTAT = 'ocupacio_estat';
const LS_EXCLOSES = 'ocupacio_excloses';
const LS_AMAGADA = 'ocupacio_llista_amagada';
const LS_RESERVES = 'ocupacio_reserves';

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

  // Es recorda al navegador l'últim que has deixat: període, estades que has tret i llista amagada.
  const [llistaAmagada, setLlistaAmagada] = useState(false);
  // Les reserves que encara han d'entrar (encara que sigui després del període): per defecte, sí.
  const [ambReserves, setAmbReserves] = useState(true);
  const excloses = useRef<Set<string>>(new Set());
  const [restaurat, setRestaurat] = useState(false);
  useEffect(() => {
    try {
      const e = JSON.parse(window.localStorage.getItem(LS_ESTAT) ?? 'null') as EstatPeriode | null;
      if (e && typeof e === 'object' && 'tipus' in e) setEstat(e);
      const x = JSON.parse(window.localStorage.getItem(LS_EXCLOSES) ?? '[]') as unknown;
      if (Array.isArray(x)) excloses.current = new Set(x.filter((v): v is string => typeof v === 'string'));
      setLlistaAmagada(window.localStorage.getItem(LS_AMAGADA) === '1');
      setAmbReserves(window.localStorage.getItem(LS_RESERVES) !== '0');
    } catch { /* sense localStorage: valors per defecte */ }
    setRestaurat(true);
  }, []);
  useEffect(() => {
    if (!restaurat) return;
    try { window.localStorage.setItem(LS_ESTAT, JSON.stringify(estat)); } catch { /* ignora */ }
  }, [estat, restaurat]);
  useEffect(() => {
    if (!restaurat) return;
    try { window.localStorage.setItem(LS_AMAGADA, llistaAmagada ? '1' : '0'); } catch { /* ignora */ }
  }, [llistaAmagada, restaurat]);
  useEffect(() => {
    if (!restaurat) return;
    try { window.localStorage.setItem(LS_RESERVES, ambReserves ? '1' : '0'); } catch { /* ignora */ }
  }, [ambReserves, restaurat]);

  useEffect(() => {
    if (!restaurat) return;
    let viu = true;
    setCarregant(true);
    getJSON<Estada[]>(`/api/ocupacio/contractes?desde=${desde}&fins=${fins}&reserves=${ambReserves ? '1' : '0'}`)
      .then((r) => {
        if (!viu) return;
        setEstades(r);
        setTriades(new Set(r.filter((x) => !excloses.current.has(x.clau)).map((x) => x.clau)));
      })
      .catch(() => viu && setEstades([]))
      .finally(() => viu && setCarregant(false));
    return () => { viu = false; };
  }, [desde, fins, restaurat, ambReserves]);

  // Desa quines estades has tret (les noves surten triades per defecte).
  function desaExcloses(tria: Set<string>) {
    for (const x of estades) {
      if (tria.has(x.clau)) excloses.current.delete(x.clau); else excloses.current.add(x.clau);
    }
    try { window.localStorage.setItem(LS_EXCLOSES, JSON.stringify([...excloses.current])); } catch { /* ignora */ }
  }

  const totes = estades.length > 0 && triades.size === estades.length;
  const url = useMemo(() => {
    const q = new URLSearchParams({ desde, fins, reserves: ambReserves ? '1' : '0' });
    // Si no se'n tria cap, el full queda buit (no «totes»): es marca amb un id que no existeix.
    q.set('contractes', triades.size ? [...triades].join(',') : '-');
    return `/imprimir/ocupacio?${q.toString()}`;
  }, [desde, fins, triades, ambReserves]);

  const imprimeix = () => {
    // Al mòbil (i a l'app de la pantalla d'inici) imprimir des de la vista prèvia no funciona:
    // s'obre el full a la mateixa finestra, amb «← Tornar» i «Imprimir» a dalt.
    const tactil = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    const w = frame.current?.contentWindow;
    if (tactil || !w) { window.location.href = `${url}&auto=1`; return; }
    w.focus(); w.print();
  };
  const canviaTria = (n: Set<string>) => { setTriades(n); desaExcloses(n); };
  const alterna = (id: string) => {
    const n = new Set(triades);
    if (n.has(id)) n.delete(id); else n.add(id);
    canviaTria(n);
  };

  return (
    <div>
      <PageHeader
        title="Ocupació"
        subtitle="Un paràgraf per contracte, amb els pagaments. Per imprimir o desar com a PDF."
        actions={
          <div className="flex gap-2">
            <button type="button" onClick={imprimeix} disabled={triades.size === 0} className={classePdf('md')}><FileText className="h-4 w-4" /> Imprimir / desar PDF</button>
            <a href={url} title="Obre el full sencer (amb «← Tornar»)">
              <Button type="button" variant="outline" aria-label="Obrir el full sencer"><ExternalLink className="h-4 w-4" /></Button>
            </a>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PeriodeEnLinia estat={estat} onChange={setEstat} avui={avui} primerDia="2000-01-01" />
        <Button type="button" variant="outline" onClick={() => setLlistaAmagada((v) => !v)} aria-pressed={!llistaAmagada}>
          {llistaAmagada ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {llistaAmagada ? 'Mostra les estades' : 'Amaga les estades'}
        </Button>
      </div>

      <div className={llistaAmagada ? 'grid gap-4' : 'grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]'}>
        {!llistaAmagada && <Card>
          <CardHeader>
            <CardTitle>Estades del període</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{carregant ? 'Carregant…' : `${triades.size} de ${estades.length} triades`}</span>
              <button
                type="button"
                className="font-semibold text-brand-700 hover:underline"
                onClick={() => canviaTria(totes ? new Set() : new Set(estades.map((x) => x.clau)))}
              >
                {totes ? 'Treu-les totes' : 'Tria-les totes'}
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 border border-brand-200 bg-brand-50/40 px-3 py-2 text-sm text-slate-800">
              <input type="checkbox" checked={ambReserves} onChange={(e) => setAmbReserves(e.target.checked)} className="h-4 w-4 accent-brand-700" />
              Incloure les <b className="font-semibold">reserves</b> (les que encara han d&apos;entrar)
            </label>
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto border border-slate-200">
              {estades.map((x) => (
                <li key={x.clau}>
                  <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={triades.has(x.clau)} onChange={() => alterna(x.clau)} className="mt-0.5 h-4 w-4 accent-brand-700" />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-800">{x.persones.map(nomPropi).join(', ')}</span>
                      <span className={`block text-xs ${x.reserva ? 'text-brand-700' : 'text-slate-500'}`}>
                        {x.reserva ? 'Reserva · ' : ''}
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
        </Card>}

        <div className="min-w-0 border border-slate-200 bg-slate-200/60 p-3">
          <iframe ref={frame} title="Full d'ocupació" src={url} className="block h-[85vh] w-full border-0" />
        </div>
      </div>
    </div>
  );
}
