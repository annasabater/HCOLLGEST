'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PeriodeEnLinia } from '@/components/ui/navegador-periode';
import type { EstatPeriode } from '@/lib/periode';
import { cn } from '@/lib/utils';

const botoPetit =
  'inline-flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-brand-600 hover:text-brand-700';

/** PDF (enllaç) i/o Excel (descàrrega o funció) d'un informe. */
function InformeFila({
  nom,
  desc,
  pdf,
  excelHref,
  onExcel,
  pdfAvis,
}: {
  nom: string;
  desc: string;
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
      <span className="flex shrink-0 gap-1.5">
        {pdf ? (
          <a href={pdf} target="_blank" rel="noreferrer" className={botoPetit}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </a>
        ) : (
          <span className={cn(botoPetit, 'cursor-not-allowed border-slate-200 text-slate-300 hover:border-slate-200 hover:text-slate-300')} title={pdfAvis}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </span>
        )}
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
 * «Imprimir ▾» del Balanç: el període (el mateix de la pàgina) i els informes amb
 * PDF i Excel. Resum del balanç, despeses per proveïdor i despeses per categoria.
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
  onExcelResum: () => void;
  /** Vista «Situació»: té el seu propi període, només hi ha el resum en Excel. */
  senseInformes?: boolean;
  /** Criteri del balanç (per dies o fiscal): l'informe amb gràfics l'hereta. */
  criteri?: string;
  /** Comptes de propietat: l'informe amb gràfics només surt sense fiances. */
  senseFiances?: boolean;
}) {
  const [obert, setObert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!obert) return;
    const clic = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setObert(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setObert(false); };
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', clic); document.removeEventListener('keydown', tecla); };
  }, [obert]);

  const grafics = (fiances: 'sense' | 'amb' | 'tot') =>
    `/imprimir/balanc?desde=${desde}&fins=${fins}&fiances=${fiances}&criteri=${criteri}&auto=1`;
  const informe = (per: 'proveidor' | 'categoria', extra = '') =>
    `/imprimir/despeses-agrupades?per=${per}&desde=${desde}&fins=${fins}${extra}`;

  return (
    <div ref={ref} className="relative">
      <Button aria-expanded={obert} aria-haspopup="dialog" onClick={() => setObert((o) => !o)}>
        <Printer className="h-4 w-4" /> Imprimir <ChevronDown className="h-4 w-4" />
      </Button>
      {obert && (
        <div
          role="dialog"
          aria-label="Imprimir informes"
          className="ui-card absolute right-0 z-30 mt-1 w-[30rem] max-w-[calc(100vw-2rem)] border border-slate-300 bg-white shadow-lg"
        >
          {!senseInformes && (
            <div className="space-y-2 border-b border-slate-100 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Període dels informes</p>
              <div className="flex flex-wrap items-center gap-2">
                <PeriodeEnLinia estat={estat} onChange={onEstat} avui={avui} />
              </div>
            </div>
          )}
          <div className="divide-y divide-slate-100 py-1">
            {!senseInformes && (
              <div className="px-4 py-2.5">
                <span className="block text-sm font-semibold text-slate-900">Informe amb gràfics</span>
                <span className="block text-xs text-slate-500">
                  Resultat, mes a mes amb els imports, despeses, pagaments i caixa. Per imprimir o desar com a PDF.
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <a href={grafics('sense')} target="_blank" rel="noreferrer" className={botoPetit} title="El resultat real: el que compta per a Hisenda">
                    <Printer className="h-3.5 w-3.5" /> Sense fiances
                  </a>
                  {!senseFiances && (
                    <>
                      <a href={grafics('amb')} target="_blank" rel="noreferrer" className={botoPetit} title="Tot el que ha entrat i sortit, amb les fiances">
                        <Printer className="h-3.5 w-3.5" /> Amb fiances
                      </a>
                      <a href={grafics('tot')} target="_blank" rel="noreferrer" className={botoPetit} title="Les dues vistes en un sol informe">
                        <Printer className="h-3.5 w-3.5" /> Total (les dues)
                      </a>
                    </>
                  )}
                </span>
              </div>
            )}
            <InformeFila
              nom="Resum del balanç"
              desc="Ingressos, despeses, benefici, fiances i mes a mes"
              pdf={pdfResum}
              pdfAvis="El PDF del resum només es fa per a mesos o anys sencers."
              onExcel={() => { onExcelResum(); setObert(false); }}
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
              Els informes de despeses no inclouen les fiances. Es fan amb el període de dalt.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
