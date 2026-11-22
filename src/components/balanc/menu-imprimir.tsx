'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PeriodeEnLinia, Segmentat } from '@/components/ui/navegador-periode';
import type { ModeFiances } from '@/lib/informes-despeses';
import type { EstatPeriode } from '@/lib/periode';
import { cn } from '@/lib/utils';

const botoPetit =
  'inline-flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-brand-600 hover:text-brand-700';
const botoApagat = cn(botoPetit, 'cursor-not-allowed border-slate-200 text-slate-300 hover:border-slate-200 hover:text-slate-300');

const MODES: { valor: ModeFiances; label: string; desc: string }[] = [
  { valor: 'tot', label: 'Total (les dues)', desc: 'Les dues vistes en un sol informe.' },
  { valor: 'sense', label: 'Sense fiances', desc: 'El resultat real: el que compta per a Hisenda.' },
  { valor: 'amb', label: 'Amb fiances', desc: 'Tot el que ha entrat i sortit, amb les fiances a part.' },
];

/** Un informe: els seus botons (Gràfics, PDF i Excel segons el que tingui). */
function InformeFila({
  nom,
  desc,
  grafics,
  pdf,
  excelHref,
  onExcel,
  pdfAvis,
}: {
  nom: string;
  desc: string;
  /** Informe amb gràfics (enllaç que s'obre i s'imprimeix sol). */
  grafics?: string;
  pdf?: string | null;
  excelHref?: string;
  onExcel?: () => void;
  /** Per què el PDF no està disponible (surt en passar-hi el ratolí). */
  pdfAvis?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{nom}</span>
        <span className="block text-xs text-slate-500">{desc}</span>
      </span>
      <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
        {grafics && (
          <a href={grafics} target="_blank" rel="noreferrer" className={botoPetit} title="Amb els gràfics, per imprimir o desar com a PDF">
            <FileText className="h-3.5 w-3.5" /> PDF
          </a>
        )}
        {pdf !== undefined &&
          (pdf ? (
            <a href={pdf} target="_blank" rel="noreferrer" className={botoPetit}>
              <FileText className="h-3.5 w-3.5" /> PDF
            </a>
          ) : (
            <span className={botoApagat} title={pdfAvis}>
              <FileText className="h-3.5 w-3.5" /> PDF
            </span>
          ))}
        {excelHref ? (
          <a href={excelHref} className={botoPetit}>
            <Download className="h-3.5 w-3.5" /> Excel
          </a>
        ) : (
          <button type="button" onClick={onExcel} className={botoPetit}>
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
        )}
      </span>
    </div>
  );
}

/**
 * «Imprimir ▾» del Balanç: el període (el mateix de la pàgina), la vista de fiances
 * (sense / amb / total) i els informes: el resum del balanç (gràfics, PDF i Excel), les
 * despeses per proveïdor i per categoria. La vista de fiances serveix per als tres.
 */
export function MenuImprimir({
  estat,
  onEstat,
  avui,
  desde,
  fins,
  pdfResum,
  onExcelResum,
  senseInformes,
  criteri = 'dies',
  senseFiances = false,
}: {
  estat: EstatPeriode;
  onEstat: (e: EstatPeriode) => void;
  avui: string;
  desde: string;
  fins: string;
  /** PDF del resum (només mesos i anys sencers), o null. */
  pdfResum: string | null;
  onExcelResum: (fiances: ModeFiances) => void;
  /** Vista «Situació»: té el seu propi període, només hi ha el resum en Excel. */
  senseInformes?: boolean;
  /** Criteri del balanç (per dies o fiscal): l'informe amb gràfics l'hereta. */
  criteri?: string;
  /** Comptes de propietat: no veuen fiances, tot surt «sense fiances». */
  senseFiances?: boolean;
}) {
  const [obert, setObert] = useState(false);
  const [fiances, setFiances] = useState<ModeFiances>('sense');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!obert) return;
    const clic = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setObert(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setObert(false); };
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', clic); document.removeEventListener('keydown', tecla); };
  }, [obert]);

  const mode: ModeFiances = senseFiances ? 'sense' : fiances;
  const grafics = `/imprimir/balanc?desde=${desde}&fins=${fins}&fiances=${mode}&criteri=${criteri}&auto=1`;
  const informe = (per: 'proveidor' | 'categoria', extra = '') =>
    `/imprimir/despeses-agrupades?per=${per}&desde=${desde}&fins=${fins}&fiances=${mode}${extra}`;

  return (
    <div ref={ref} className="relative">
      <Button aria-expanded={obert} aria-haspopup="dialog" onClick={() => setObert((o) => !o)}>
        <Printer className="h-4 w-4" /> Imprimir <ChevronDown className="h-4 w-4" />
      </Button>
      {obert && (
        <div
          role="dialog"
          aria-label="Imprimir informes"
          className="ui-card absolute right-0 z-30 mt-1 w-[32rem] max-w-[calc(100vw-2rem)] border border-slate-300 bg-white shadow-lg"
        >
          {!senseInformes && (
            <div className="space-y-3 border-b border-slate-100 px-4 py-3">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Període dels informes</p>
                <div className="flex flex-wrap items-center gap-2">
                  <PeriodeEnLinia estat={estat} onChange={onEstat} avui={avui} />
                </div>
              </div>
              {!senseFiances && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Fiances</p>
                  <Segmentat etiqueta="Fiances als informes" opcions={MODES.map((m) => ({ valor: m.valor, label: m.label }))} valor={fiances} onChange={setFiances} />
                  <p className="text-xs text-slate-500">{MODES.find((m) => m.valor === fiances)!.desc} Val per als tres informes.</p>
                </div>
              )}
            </div>
          )}
          <div className="divide-y divide-slate-100 py-1">
            <InformeFila
              nom="Resum del balanç"
              desc="Ingressos, despeses, benefici i mes a mes"
              grafics={senseInformes ? undefined : grafics}
              pdf={senseInformes ? (pdfResum ? `${pdfResum}&fiances=${mode}` : null) : undefined}
              pdfAvis="El PDF del resum només es fa per a mesos o anys sencers. L'informe amb gràfics serveix per a qualsevol període."
              onExcel={() => { onExcelResum(mode); setObert(false); }}
            />
            {!senseInformes && (
              <>
                <InformeFila
                  nom="Despeses per proveïdor"
                  desc="Factures, base, IVA i total pagat a cada proveïdor"
                  pdf={informe('proveidor')}
                  excelHref={informe('proveidor', '&format=csv')}
                />
                <InformeFila
                  nom="Despeses per categoria"
                  desc="Lloguer, subministraments, neteja…"
                  pdf={informe('categoria')}
                  excelHref={informe('categoria', '&format=csv')}
                />
              </>
            )}
          </div>
          {!senseInformes && (
            <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              Tots es fan amb el període de dalt{senseFiances ? '' : ' i la vista de fiances triada'}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
