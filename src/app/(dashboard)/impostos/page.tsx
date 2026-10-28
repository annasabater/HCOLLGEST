'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Copy, Check, Download, ExternalLink, FileText, FileDown, ShieldCheck, BookOpen, Undo2, CalendarClock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatEur, cn } from '@/lib/utils';
import { CONCEPTES_100, type Caselles, type Concepte100, type ModelFiscal, type PerTipus } from '@/lib/impostos';
import type { ImpostosAny, Ieet950, ModelInfo, TrimestreInfo } from '@/lib/services/impostos';
import type { AvisBoe } from '@/lib/services/boe-formularis';
import type { ResultatValidacio } from '@/lib/aeat/servei';
import { CertificatAeatCard, PresentarAeat } from '@/components/impostos/presentacio-aeat';

type Unitat = 'eur' | 'pct' | 'n';
interface Fila { c: string; text: string; u?: Unitat; clau?: boolean }

/** Caselles que es mostren de cada model, en l'ordre del formulari de l'AEAT. */
const FILES: Record<ModelFiscal, Fila[]> = {
  '303': [
    { c: '01', text: 'Base imposable al 4 %' }, { c: '02', text: 'Tipus', u: 'pct' }, { c: '03', text: 'Quota al 4 %' },
    { c: '04', text: 'Base imposable al 10 % (allotjament)' }, { c: '05', text: 'Tipus', u: 'pct' }, { c: '06', text: 'Quota al 10 %' },
    { c: '07', text: 'Base imposable al 21 %' }, { c: '08', text: 'Tipus', u: 'pct' }, { c: '09', text: 'Quota al 21 %' },
    { c: '27', text: 'Total quota meritada' },
    { c: '28', text: 'Base IVA suportat (operacions interiors corrents)' },
    { c: '29', text: 'Quota suportada deduïble' },
    { c: '45', text: 'Total a deduir' },
    { c: '46', text: 'Resultat règim general (27 − 45)' },
    { c: '64', text: 'Suma de resultats' },
    { c: '65', text: 'Atribuïble a l’Administració de l’Estat', u: 'pct' },
    { c: '66', text: 'Atribuïble a l’Administració de l’Estat' },
    { c: '110', text: 'Quotes a compensar de períodes anteriors' },
    { c: '78', text: 'Quotes a compensar aplicades en aquest període' },
    { c: '87', text: 'Quotes a compensar pendents per a períodes posteriors' },
    { c: '69', text: 'Resultat de l’autoliquidació (66 − 78)' },
    { c: '71', text: 'Resultat', clau: true },
    { c: '72', text: 'A compensar en els trimestres següents', clau: true },
    { c: '73', text: 'A retornar (només al 4T)', clau: true },
  ],
  '130': [
    { c: '01', text: 'Ingressos acumulats (de l’1 de gener a final del trimestre)' },
    { c: '02', text: 'Despeses deduïbles acumulades' },
    { c: '03', text: 'Rendiment net (01 − 02)' },
    { c: '04', text: '20 % del rendiment net' },
    { c: '05', text: 'Pagaments dels trimestres anteriors (07 presentats)' },
    { c: '06', text: 'Retencions que t’han practicat' },
    { c: '07', text: 'Pagament fraccionat del trimestre (04 − 05 − 06)' },
    { c: '12', text: 'Suma de pagaments fraccionats (07 + 11)' },
    { c: '13', text: 'Minoració art. 110.3.c del Reglament' },
    { c: '14', text: 'Diferència (12 − 13)' },
    { c: '15', text: 'Resultats negatius de trimestres anteriors' },
    { c: '16', text: 'Adquisició o rehabilitació de l’habitatge habitual' },
    { c: '17', text: 'Total (14 − 15 − 16)' },
    { c: '18', text: 'Resultat de l’anterior autoliquidació (només complementària)' },
    { c: '19', text: 'Resultat de l’autoliquidació (17 − 18)', clau: true },
  ],
  '115': [
    { c: '01', text: 'Nombre de perceptors (propietaris)', u: 'n' },
    { c: '02', text: 'Base de les retencions (lloguer sense IVA)' },
    { c: '03', text: 'Retencions i ingressos a compte' },
    { c: '04', text: 'A deduir (només complementària)' },
    { c: '05', text: 'Resultat a ingressar', clau: true },
  ],
  '390': [
    { c: '01', text: 'Base al 4 % (règim ordinari)' }, { c: '02', text: 'Quota al 4 %' },
    { c: '03', text: 'Base al 10 % (règim ordinari)' }, { c: '04', text: 'Quota al 10 %' },
    { c: '05', text: 'Base al 21 % (règim ordinari)' }, { c: '06', text: 'Quota al 21 %' },
    { c: '33', text: 'Total bases IVA meritat' }, { c: '34', text: 'Total quotes IVA meritat' },
    { c: '47', text: 'Total quotes d’IVA i recàrrec d’equivalència' },
    { c: '190', text: 'Deduïble interiors corrents · base al 4 %' }, { c: '191', text: 'Quota al 4 %' },
    { c: '603', text: 'Deduïble interiors corrents · base al 10 %' }, { c: '604', text: 'Quota al 10 %' },
    { c: '605', text: 'Deduïble interiors corrents · base al 21 %' }, { c: '606', text: 'Quota al 21 %' },
    { c: '48', text: 'Total base deduïble operacions interiors corrents' },
    { c: '49', text: 'Total quota deduïble operacions interiors corrents' },
    { c: '64', text: 'Suma de deduccions' },
    { c: '65', text: 'Resultat règim general (47 − 64)' },
    { c: '84', text: 'Suma de resultats' },
    { c: '85', text: 'Compensació de quotes de l’exercici anterior' },
    { c: '86', text: 'Resultat de la liquidació (84 − 85)', clau: true },
    { c: '95', text: 'Total a ingressar als 303 de l’any' },
    { c: '97', text: 'Últim 303: a compensar' },
    { c: '98', text: 'Últim 303: a retornar' },
    { c: '99', text: 'Operacions en règim general' },
    { c: '108', text: 'Volum d’operacions', clau: true },
  ],
  '180': [
    { c: '01', text: 'Nombre de perceptors', u: 'n' },
    { c: '02', text: 'Base de les retencions de l’any' },
    { c: '03', text: 'Retencions de l’any', clau: true },
  ],
  '347': [
    { c: '01', text: 'Persones i entitats a declarar', u: 'n', clau: true },
    { c: '02', text: 'Import total de les seves operacions (IVA inclòs)' },
  ],
};

const TITOL: Record<ModelFiscal, { nom: string; sub: string }> = {
  '303': { nom: 'Model 303 · IVA', sub: 'Només el trimestre' },
  '130': { nom: 'Model 130 · IRPF a compte', sub: 'Acumulat de l’any, menys el ja pagat' },
  '115': { nom: 'Model 115 · Retencions del lloguer', sub: 'El 19 % retingut a la propietària del local' },
  '390': { nom: 'Model 390 · Resum anual d’IVA', sub: 'Informatiu: suma dels quatre 303' },
  '180': { nom: 'Model 180 · Resum anual del lloguer', sub: 'Informatiu: suma dels quatre 115' },
  '347': { nom: 'Model 347 · Operacions amb terceres persones', sub: 'Informatiu: clients i proveïdors de més de 3.005,06 € l’any' },
};

/** Fitxa del tràmit a la Seu electrònica de l'AEAT. */
const SEU: Partial<Record<ModelFiscal, string>> = {
  '303': 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml',
  '130': 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml',
  '115': 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH02.shtml',
  '390': 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G412.shtml',
};

/** D'on surt el formulari oficial que s'omple (annex del BOE). */
const FONT_FORMULARI: Partial<Record<ModelFiscal, string>> = {
  '303': 'BOE Orden HAC/27/2026',
  '390': 'BOE Orden HAC/27/2026',
  '130': 'BOE Orden HAP/258/2015',
};

const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const avuiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const diesFins = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${avuiIso()}T00:00:00Z`)) / 86_400_000);
/** Format per enganxar a la Seu: "12880,94" (coma decimal, sense milers). */
const perCopiar = (n: number) => n.toFixed(2).replace('.', ',');

function valor(n: number, u: Unitat = 'eur') {
  if (u === 'pct') return `${n.toLocaleString('es-ES', { minimumFractionDigits: 2 })} %`;
  if (u === 'n') return String(n);
  return formatEur(n);
}

/** Què vol dir el resultat del model (a ingressar, a compensar…). */
function resultat(m: ModelInfo, c: Caselles): { import: number; text: string; tone: 'danger' | 'success' | 'neutral' | 'info' } {
  switch (m.model) {
    case '303':
      if ((c['71'] ?? 0) > 0) return { import: c['71']!, text: 'A ingressar', tone: 'danger' };
      if (c['72']) return { import: c['72'], text: 'A compensar (no pagues res)', tone: 'success' };
      if (c['73']) return { import: c['73'], text: 'A retornar (o a compensar)', tone: 'success' };
      return { import: 0, text: 'Resultat zero', tone: 'neutral' };
    case '130':
      return (c['19'] ?? 0) > 0
        ? { import: c['19']!, text: 'A ingressar', tone: 'danger' }
        : { import: 0, text: 'Resultat zero (no pagues res)', tone: 'neutral' };
    case '115':
      return { import: c['05'] ?? 0, text: (c['05'] ?? 0) > 0 ? 'A ingressar' : 'Sense retencions', tone: (c['05'] ?? 0) > 0 ? 'danger' : 'neutral' };
    case '390':
      return { import: c['86'] ?? 0, text: 'Informativa (no es paga res)', tone: 'info' };
    case '180':
      return { import: c['03'] ?? 0, text: 'Informativa (no es paga res)', tone: 'info' };
    case '347':
      return { import: c['02'] ?? 0, text: 'Informativa (no es paga res)', tone: 'info' };
  }
}

function EstatBadge({ m }: { m: Pick<ModelInfo, 'estat' | 'termini'> }) {
  if (m.estat === 'presentada') return <Badge tone="success">Presentada</Badge>;
  if (m.estat === 'no_cal') return <Badge>No cal</Badge>;
  if (m.estat === 'futur') return <Badge>Encara no</Badge>;
  if (m.estat === 'en_curs') return <Badge tone="info">Trimestre en curs</Badge>;
  const n = diesFins(m.termini);
  if (n < 0) return <Badge tone="danger">Fora de termini</Badge>;
  return <Badge tone="warning">{n === 0 ? 'Avui és l’últim dia' : `Pendent · queden ${n} dies`}</Badge>;
}

function BotoCopia({ n }: { n: number }) {
  const [fet, setFet] = useState(false);
  return (
    <button
      type="button"
      title="Copia per enganxar a la Seu"
      className={cn('ml-2 inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 hover:border-brand-300 hover:text-brand-700', fet && 'border-green-300 text-green-700')}
      onClick={() => {
        void navigator.clipboard?.writeText(perCopiar(n)).catch(() => {});
        setFet(true);
        setTimeout(() => setFet(false), 1200);
      }}
    >
      {fet ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ModelCard({ m, any, onCanvi, extra }: { m: ModelInfo; any: number; onCanvi: () => Promise<void>; extra?: React.ReactNode }) {
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const [justificant, setJustificant] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const c = m.presentada?.caselles ?? m.calculades;
  // Totes les caselles calculades; les de compensació del 303 només si s'usen.
  const files = FILES[m.model].filter(
    (f) => c[f.c] !== undefined && !(m.model === '303' && ['110', '78', '87'].includes(f.c) && c[f.c] === 0),
  );
  const r = resultat(m, c);
  const titol = TITOL[m.model];
  const avisDifereix = m.difereix ? resultat(m, m.calculades) : null;

  async function desa() {
    if (!edit) return;
    setBusy(true);
    setErr(null);
    try {
      const caselles = Object.fromEntries(
        Object.entries(edit).map(([k, v]) => [k, Number(String(v).replace(/\./g, '').replace(',', '.')) || 0]),
      );
      await postJSON('/api/impostos/declaracions', { model: m.model, any, periode: m.periode, caselles, justificant });
      setEdit(null);
      await onCanvi();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
    } finally {
      setBusy(false);
    }
  }

  // Fitxer d'importació de l'AEAT (303/130/115). Es domicilia el pagament si
  // encara som dins del termini de domiciliació (fins a 5 dies abans del final).
  const pagamentAeat = () => {
    const limitDomiciliacio = new Date(`${m.termini}T23:59:59`);
    limitDomiciliacio.setDate(limitDomiciliacio.getDate() - 5);
    return new Date() <= limitDomiciliacio ? 'U' : 'I';
  };
  const [validacio, setValidacio] = useState<ResultatValidacio | null>(null);

  // Validació oficial de l'AEAT (ServValiDos): no presenta res.
  async function validaAeat() {
    setBusy(true);
    setErr(null);
    setValidacio(null);
    try {
      setValidacio(await postJSON<ResultatValidacio>('/api/impostos/validar', { model: m.model, any, trimestre: m.periode, pagament: pagamentAeat() }));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut validar amb l’AEAT');
    } finally {
      setBusy(false);
    }
  }

  function obreEsborrany(b64: string) {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank');
  }

  async function baixaFitxer() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/impostos/fitxer?model=${m.model}&any=${any}&trimestre=${m.periode}&pagament=${pagamentAeat()}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? 'No s’ha pogut generar el fitxer');
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${m.model}_${any}_${m.periode}T.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No s’ha pogut generar el fitxer');
    } finally {
      setBusy(false);
    }
  }

  async function desfes() {
    if (!confirm('Vols desmarcar aquesta autoliquidació com a presentada?')) return;
    setBusy(true);
    try {
      await delJSON(`/api/impostos/declaracions?model=${m.model}&any=${any}&periode=${m.periode}`);
      await onCanvi();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cn(m.estat === 'no_cal' && 'opacity-70')}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{titol.nom}</CardTitle>
          <p className="text-xs text-slate-500">{titol.sub}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <EstatBadge m={m} />
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" /> Termini: {dataCurta(m.termini)}
          </span>
        </div>
      </CardHeader>
      <CardBody>
        {m.estat === 'no_cal' ? (
          <p className="text-sm text-slate-500">
            {m.model === '115' || m.model === '180' ? 'No hi ha cap lloguer amb retenció en aquest període.' : 'Sense activitat en aquest període: no cal presentar-lo.'}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-baseline justify-between gap-3 rounded-lg bg-brand-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">{r.text}</span>
              <span className={cn('text-2xl font-semibold tabular-nums', r.tone === 'danger' ? 'text-brand-800' : r.tone === 'success' ? 'text-green-700' : 'text-slate-800')}>
                {formatEur(r.import)}
              </span>
            </div>

            {m.presentada && (
              <p className="mb-3 text-xs text-green-800">
                Presentada el {dataCurta(m.presentada.presentadaEl)}
                {m.presentada.justificant ? ` · justificant ${m.presentada.justificant}` : ''}{m.presentada.csv ? ` · CSV ${m.presentada.csv}` : ''}. Es mostren les caselles tal com es van presentar.
                {m.presentada.ambPdf && (
                  <>
                    {' '}
                    <a className="font-semibold underline" href={`/api/impostos/justificant?model=${m.model}&any=${any}&periode=${m.periode}`} target="_blank" rel="noreferrer">
                      Obre el justificant (PDF)
                    </a>
                  </>
                )}
              </p>
            )}
            {avisDifereix && (
              <p className="mb-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Amb les dades d’avui sortiria {formatEur(avisDifereix.import)} ({avisDifereix.text.toLowerCase()}). Si has canviat factures o gastos d’aquest període després de presentar-la, pot caldre una complementària.
              </p>
            )}

            <table className="w-full text-sm">
              <tbody>
                {(edit ? FILES[m.model].filter((f) => edit[f.c] !== undefined) : files).map((f) => {
                  const v = c[f.c] ?? 0;
                  return (
                    <tr key={f.c} className={cn('border-t border-slate-100', f.clau && 'bg-slate-50 font-semibold')}>
                      <td className="w-12 py-1.5 pr-2 align-middle">
                        <span className="inline-block min-w-9 rounded border border-brand-300 px-1 text-center text-[11px] font-semibold text-brand-700">{f.c}</span>
                      </td>
                      <td className="py-1.5 pr-2 text-slate-700">{f.text}</td>
                      <td className="whitespace-nowrap py-1.5 text-right tabular-nums">
                        {edit ? (
                          <Input
                            className="h-8 w-32 text-right"
                            value={edit[f.c]}
                            onChange={(e) => setEdit({ ...edit, [f.c]: e.target.value })}
                          />
                        ) : (
                          <>
                            <span className={cn(v < 0 && 'text-green-700')}>{valor(v, f.u)}</span>
                            {f.u !== 'pct' && <BotoCopia n={v} />}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {extra}

            {edit && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-600">
                  Posa les xifres <b>exactament</b> com les has presentat a la Seu (si hi has tocat algun cèntim, corregeix-lo aquí). Els trimestres següents faran servir aquests imports.
                </p>
                <Input placeholder="Núm. de justificant (opcional)" value={justificant} onChange={(e) => setJustificant(e.target.value)} />
                {err && <p className="text-xs text-red-700">{err}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void desa()} disabled={busy}>Desa com a presentada</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel·la</Button>
                </div>
              </div>
            )}

            {!edit && (
              <div className="mt-4 flex flex-wrap gap-2">
                {FONT_FORMULARI[m.model] && (
                  <a
                    href={`/api/impostos/formulari?model=${m.model}&any=${any}&periode=${m.periode}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`Formulari oficial: ${FONT_FORMULARI[m.model]}`}
                  >
                    <Button size="sm" variant="outline"><Download className="h-4 w-4" /> Formulari oficial (PDF)</Button>
                  </a>
                )}
                {(m.model === '303' || m.model === '130' || m.model === '115') && m.periode >= 1 && any >= 2026 && m.estat !== 'futur' && (
                  <Button size="sm" variant="outline" onClick={() => void baixaFitxer()} disabled={busy}
                    title="Fitxer en format oficial de l’AEAT: a la Seu, obre el formulari i fes «Importar»">
                    <FileDown className="h-4 w-4" /> Fitxer per importar a la Seu
                  </Button>
                )}
                {(m.model === '303' || m.model === '130' || m.model === '115') && m.periode >= 1 && any >= 2026 && m.estat !== 'futur' && (
                  <Button size="sm" variant="outline" onClick={() => void validaAeat()} disabled={busy}
                    title="L’AEAT revisa el fitxer i en torna l’esborrany oficial en PDF. No presenta res.">
                    <ShieldCheck className="h-4 w-4" /> Validar a l’AEAT
                  </Button>
                )}
                {(m.model === '303' || m.model === '130' || m.model === '115') && m.periode >= 1 && any >= 2026 && m.estat !== 'futur' && !m.presentada && (
                  <PresentarAeat
                    model={m.model} any={any} periode={m.periode} resum={r.text}
                    importResultat={r.tone === 'danger' ? r.import : -r.import}
                    pagament={pagamentAeat()} onFet={onCanvi}
                  />
                )}
                {SEU[m.model] && (
                  <a href={SEU[m.model]} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink className="h-4 w-4" /> Seu electrònica</Button>
                  </a>
                )}
                {m.presentada ? (
                  <Button size="sm" variant="ghost" onClick={() => void desfes()} disabled={busy}><Undo2 className="h-4 w-4" /> Desmarca</Button>
                ) : (
                  m.estat !== 'futur' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setEdit(Object.fromEntries(FILES[m.model].filter((f) => m.calculades[f.c] !== undefined).map((f) => [f.c, perCopiar(m.calculades[f.c]!)])))
                      }
                    >
                      Marca com a presentada
                    </Button>
                  )
                )}
              </div>
            )}
            {!edit && err && <p className="mt-2 text-xs text-red-700">{err}</p>}
            {!edit && validacio && (
              <div className={cn('mt-3 rounded-lg px-3 py-2 text-xs', validacio.errors.length ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900')}>
                <p className="font-semibold">
                  {validacio.errors.length ? 'L’AEAT hi ha trobat errors:' : 'L’AEAT l’ha validat sense errors. Encara no s’ha presentat.'}
                </p>
                {[...validacio.errors, ...validacio.avisos].length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {validacio.errors.map((e) => <li key={`e${e}`}>{e}</li>)}
                    {validacio.avisos.map((a) => <li key={`a${a}`} className="text-amber-800">Avís: {a}</li>)}
                  </ul>
                )}
                {validacio.pdfBase64 && (
                  <button type="button" className="mt-1 font-semibold underline" onClick={() => obreEsborrany(validacio.pdfBase64!)}>
                    Obre l’esborrany oficial (PDF)
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function RendaCard({ r, any }: { r: ImpostosAny['renda']; any: number }) {
  const fila = (text: string, v: number, opts?: { clau?: boolean; signe?: string }) => (
    <tr className={cn('border-t border-slate-100', opts?.clau && 'bg-slate-50 font-semibold')}>
      <td className="py-1.5 pr-2 text-slate-700">{opts?.signe ? `${opts.signe} ` : ''}{text}</td>
      <td className="whitespace-nowrap py-1.5 text-right tabular-nums">{formatEur(v)}<BotoCopia n={v} /></td>
    </tr>
  );
  return (
    <Card className="xl:col-span-2">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Model 100 · Renda {any} (part de l’hostal)</CardTitle>
          <p className="text-xs text-slate-500">Rendiments d’activitats econòmiques · estimació directa simplificada</p>
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <CalendarClock className="h-3.5 w-3.5" /> Campanya: abril – {dataCurta(r.termini)}
        </span>
      </CardHeader>
      <CardBody>
        <div className="grid gap-6 lg:grid-cols-2">
          <table className="w-full text-sm">
            <tbody>
              {fila('Ingressos íntegres (sense IVA)', r.ingressos, { clau: true })}
              {(Object.keys(CONCEPTES_100) as Concepte100[])
                .filter((k) => r.gastos[k] !== 0)
                .map((k) => <Fragment key={k}>{fila(CONCEPTES_100[k], r.gastos[k], { signe: '−' })}</Fragment>)}
              {fila('Total despeses', r.totalGastos)}
              {fila('Diferència', r.diferencia)}
              {fila('Provisions i despeses de difícil justificació (5 %, màx. 2.000 €)', r.dificilJustificacio, { signe: '−' })}
              {fila('Rendiment net', r.rendimentNet, { clau: true })}
              {r.iniciActivitat && fila('Reducció per inici d’activitat (20 %)', r.reduccioInici, { signe: '−' })}
              {fila('Rendiment net reduït', r.rendimentNetReduit, { clau: true })}
              {fila('Pagaments fraccionats (130) de l’any', r.pagamentsFraccionats)}
            </tbody>
          </table>
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Aquestes xifres van a <b>Renta WEB → Rendiments d’activitats econòmiques en estimació directa</b>. La resta de la renda (altres ingressos, situació familiar, deduccions) no surt del gestio: la fa el gestor o es completa a Renta WEB.
            </p>
            <p>Els pagaments del 130 es resten al final: si n’has pagat més del que toca, Hisenda t’ho torna.</p>
            {r.iniciActivitat ? (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-green-900">
                <b>Reducció del 20 % per inici d’activitat</b> (art. 32.3 LIRPF): s’aplica el primer any amb rendiment positiu i el següent, si l’any anterior a l’alta no tenies cap altra activitat econòmica. Confirma-ho amb el gestor.
              </p>
            ) : (
              <p>No s’aplica la reducció per inici d’activitat (hi ha moviments l’any anterior).</p>
            )}
            {r.immobilitzat > 0 && (
              <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Hi ha {formatEur(r.immobilitzat)} de mobiliari i electrodomèstics. Si un element costa més de 300 €, potser s’ha d’amortitzar en diversos anys en lloc de restar-lo tot de cop.
              </p>
            )}
            <p>El 5 % de difícil justificació és la regla de la renda 2025; comprova que no canviï per al {any}.</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Ieet950Card({ t, onCanvi }: { t: Ieet950; onCanvi: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [anyClau, sem] = t.clau.split('-').map(Number) as [number, number];
  async function marca(presentar: boolean) {
    setBusy(true);
    try {
      if (presentar) {
        await postJSON('/api/impostos/declaracions', { model: '950', any: anyClau, periode: sem, caselles: { nits: t.nits, import: t.import } });
      } else {
        if (!confirm('Vols desmarcar el 950 com a presentat?')) return;
        await delJSON(`/api/impostos/declaracions?model=950&any=${anyClau}&periode=${sem}`);
      }
      await onCanvi();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="xl:col-span-3">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Model 950 · Taxa turística (ATC)</CardTitle>
          <p className="text-xs text-slate-500">Impost sobre les estades en establiments turístics · {t.etiqueta}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <EstatBadge m={t} />
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" /> Termini: {dataCurta(t.termini)}
          </span>
        </div>
      </CardHeader>
      <CardBody>
        {t.estat === 'futur' ? (
          <p className="text-sm text-slate-500">El període encara no ha començat.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-3 rounded-lg bg-brand-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">{t.import > 0 ? 'A ingressar' : 'Sense estades que paguin'}</span>
                <span className="text-2xl font-semibold tabular-nums text-brand-800">{formatEur(t.import)}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-t border-slate-100"><td className="py-1.5 text-slate-700">Persones allotjades</td><td className="text-right tabular-nums">{t.persones}</td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1.5 text-slate-700">Persones que paguen</td><td className="text-right tabular-nums">{t.personesPaguen}</td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1.5 text-slate-700">Estades <b>subjectes</b> (nits que paguen, màx. 7 per persona)</td><td className="text-right tabular-nums">{t.nits}<BotoCopia n={t.nits} /></td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1.5 text-slate-700">Estades <b>exemptes</b> (menors de 17 anys)</td><td className="text-right tabular-nums">{t.nitsExemptes}<BotoCopia n={t.nitsExemptes} /></td></tr>
                  <tr className="border-t border-slate-100"><td className="py-1.5 text-slate-700">Tarifa per persona i nit</td><td className="text-right tabular-nums">{formatEur(t.tarifa)}</td></tr>
                  <tr className="border-t border-slate-100 bg-slate-50 font-semibold"><td className="py-1.5">Quota ({t.nits} × {formatEur(t.tarifa)})</td><td className="text-right tabular-nums">{formatEur(t.import)}<BotoCopia n={t.import} /></td></tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              {t.incompletes > 0 && (
                <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t.incompletes} {t.incompletes === 1 ? 'estada té' : 'estades tenen'} dades del viatger incompletes. Omple-les a Taxa turística abans de presentar.
                </p>
              )}
              {t.presentada && <p className="text-green-800">Presentat el {dataCurta(t.presentada.presentadaEl)}.</p>}
              <div>
                <p className="mb-1 font-medium text-slate-700">Com es presenta (Seu de l’ATC, amb el teu certificat o idCAT):</p>
                <ol className="list-decimal space-y-0.5 pl-5">
                  <li>Pestanya <b>Establiments</b>: l’hostal amb el seu número del <b>Registre de Turisme de Catalunya</b> (es recupera de l’autoliquidació anterior).</li>
                  <li>Pestanya <b>Estades</b>: tria l’any i el període i escriu les estades <b>subjectes</b> i les <b>exemptes</b> (les dues xifres de l’esquerra).</li>
                  <li>El formulari calcula la quota; comprova que doni el mateix import. Paga amb targeta, Bizum o domiciliació, o descarrega la carta de pagament.</li>
                </ol>
                <p className="mt-1">No es puja cap fitxer ni cap llista d’hostes. L’Excel i el PDF de Taxa turística són el teu justificant de les estades: guarda’ls (i les declaracions dels exempts).</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/taxa-turistica"><Button size="sm" variant="outline"><FileText className="h-4 w-4" /> Obre la taxa turística</Button></Link>
                <a href="https://atc.gencat.cat/ca/tributs/ieet/tramit-ieet/" target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline"><ExternalLink className="h-4 w-4" /> ATC</Button>
                </a>
                <Link href="/manual/comptabilitat#com-presento-el-950-a-la-seu-de-l-atc-pas-a-pas">
                  <Button size="sm" variant="outline"><BookOpen className="h-4 w-4" /> Pas a pas amb fotos</Button>
                </Link>
                {t.presentada ? (
                  <Button size="sm" variant="ghost" onClick={() => void marca(false)} disabled={busy}><Undo2 className="h-4 w-4" /> Desmarca</Button>
                ) : (
                  t.estat !== 'no_cal' && <Button size="sm" onClick={() => void marca(true)} disabled={busy}>Marca com a presentat</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Detall347({ m, any }: { m: ImpostosAny['anual']['347']; any: number }) {
  const clau = (c: 'A' | 'B') => (c === 'A' ? 'Proveïdor (A · compres)' : 'Client (B · vendes)');
  return (
    <div className="mt-3 space-y-3 text-xs text-slate-600">
      <p className={cn('rounded-lg px-3 py-2', m.obligat ? 'bg-amber-50 text-amber-900' : 'bg-green-50 text-green-900')}>
        {m.obligat
          ? <>Cal presentar-lo (febrer de {any + 1}). El formulari del 390 ja porta la «X» a la casella <b>D</b>.</>
          : <>Ara mateix <b>no cal</b>: ningú no passa de 3.005,06 € l’any comptant el que s’hi ha de declarar. Es torna a calcular sol fins al 31 de desembre.</>}
      </p>
      {m.declarats.length > 0 && (
        <table className="w-full">
          <thead><tr className="text-left text-slate-500"><th className="py-1">Tercer</th><th>NIF</th><th>Clau</th><th className="text-right">1T</th><th className="text-right">2T</th><th className="text-right">3T</th><th className="text-right">4T</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {m.declarats.map((t) => (
              <tr key={`${t.clau}${t.nif}${t.nom}`} className="border-t border-slate-100">
                <td className="py-1">{t.nom}</td>
                <td>{t.nif || <span className="italic text-orange-700">falta</span>}</td>
                <td>{t.clau}</td>
                {t.perTrimestre.map((v, i) => <td key={i} className="text-right tabular-nums">{formatEur(v)}</td>)}
                <td className="text-right font-semibold tabular-nums">{formatEur(t.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {m.exclosos.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-slate-700">Passen de 3.005,06 € però NO es declaren:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {m.exclosos.map((e) => <li key={`${e.clau}${e.nom}${e.motiu}`}>{e.nom} · {clau(e.clau)} · {formatEur(e.total)} — {e.motiu}</li>)}
          </ul>
        </div>
      )}
      {m.aprop.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-slate-700">S’hi acosten (vigila’ls a final d’any):</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {m.aprop.map((t) => <li key={`${t.clau}${t.nif}${t.nom}`}>{t.nom} · {clau(t.clau)} · {formatEur(t.total)}</li>)}
          </ul>
        </div>
      )}
      {m.efectiu.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
          Cobraments en efectiu de més de 6.000 € d’un mateix client ({m.efectiu.map((e) => `${e.nom}: ${formatEur(e.total)}`).join(', ')}): al 347 s’han d’indicar a part.
        </p>
      )}
      <p>Les imports van amb IVA. Es presenta només per internet (Seu de l’AEAT), del 1 al 28 de febrer. Confirma els casos dubtosos amb el gestor.</p>
    </div>
  );
}

function AvisosBoe({ avisos, onCanvi }: { avisos: AvisBoe[]; onCanvi: () => Promise<void> }) {
  if (avisos.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {avisos.map((a) => (
        <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>Nova ordre al BOE ({dataCurta(a.data)}) sobre els models {a.models.join(', ')}.</b> Pot canviar caselles dels formularis: cal revisar-los abans de presentar.{' '}
              <a href={a.url} target="_blank" rel="noreferrer" className="underline">{a.id}</a>
              <span className="mt-1 block text-xs text-red-800">{a.titol.slice(0, 220)}{a.titol.length > 220 ? '…' : ''}</span>
            </span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await postJSON('/api/avisos/descartar', { tipus: 'BOE_FORMULARI', entitatId: a.id });
              await onCanvi();
            }}
          >
            Revisat
          </Button>
        </div>
      ))}
    </div>
  );
}

function sumaTipus(p: PerTipus) {
  return Object.entries(p)
    .filter(([, v]) => v.base !== 0)
    .map(([pct, v]) => `${formatEur(v.base)} al ${pct} %`)
    .join(' · ');
}

function OrigenDades({ t, any }: { t: TrimestreInfo; any: number }) {
  const g = t.totals.gastos;
  return (
    <Card className="mb-4">
      <CardBody className="text-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-slate-700">
            D’on surten les xifres del {t.trimestre}T: Llibre d’IVA del {dataCurta(t.inici)} al {dataCurta(t.fi)}
            {t.llibreDesat && <Badge tone="info" className="ml-2">versió desada (editada)</Badge>}
          </p>
          <a href={`/imprimir/trimestre-ingressos/${any}-${t.trimestre}`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline"><FileText className="h-4 w-4" /> Obre el llibre d’IVA</Button>
          </a>
        </div>
        <div className="grid gap-x-6 gap-y-1 text-slate-600 sm:grid-cols-2">
          <p>Ingressos (base): <b className="text-slate-800">{formatEur(t.totals.ingressos.base)}</b> · IVA {formatEur(t.totals.ingressos.iva)}</p>
          {!!t.totals.ingressos.senseIva && (
            <p>Dipòsits retinguts (ingrés sense IVA, només 130): <b className="text-slate-800">{formatEur(t.totals.ingressos.senseIva)}</b></p>
          )}
          <p>Gastos amb IVA (base): <b className="text-slate-800">{formatEur(g.baseAmbIva)}</b> · IVA {formatEur(g.iva)}</p>
          <p>Gastos sense IVA (només 130): <b className="text-slate-800">{formatEur(g.senseIva)}</b></p>
          <p>Nòmines (només 130): <b className="text-slate-800">{formatEur(g.nomines)}</b></p>
          {g.baseAmbIva !== 0 && <p className="sm:col-span-2 text-xs text-slate-500">IVA suportat per tipus: {sumaTipus(g.perTipus)}</p>}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Les fiances no compten mai (ni els gastos marcats com a fiança ni la fiança inclosa en una factura). Els cobraments sense factura tampoc: fes-los factura perquè entrin al llibre.
        </p>
      </CardBody>
    </Card>
  );
}

export default function ImpostosPage() {
  const [any, setAny] = useState(() => new Date().getFullYear());
  const [d, setD] = useState<ImpostosAny | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [refCad, setRefCad] = useState('');
  const [refMsg, setRefMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getJSON<ImpostosAny>(`/api/impostos?any=${any}`);
    setD(r);
    setRefCad(r.referenciaCadastral);
  }, [any]);
  useEffect(() => { setD(null); void load(); }, [load]);

  // Proper termini pendent (el que toca presentar ara).
  const proper = useMemo(() => {
    if (!d) return null;
    const pendents = [
      ...d.trimestres.flatMap((t) => Object.values(t.models).map((m) => ({ m, etiqueta: `${m.model} del ${t.trimestre}T` }))),
      ...Object.values(d.anual).map((m) => ({ m, etiqueta: m.model })),
      ...d.trimestres.flatMap((t) => (t.ieet ? [{ m: t.ieet, etiqueta: `950 (${t.ieet.etiqueta.toLowerCase()})` }] : [])),
    ].filter((x) => x.m.estat === 'pendent');
    if (pendents.length === 0) return null;
    const minim = pendents.reduce((a, x) => (x.m.termini < a ? x.m.termini : a), pendents[0]!.m.termini);
    return { termini: minim, quins: pendents.filter((x) => x.m.termini === minim).map((x) => x.etiqueta) };
  }, [d]);

  const tabPerDefecte = useMemo(() => {
    if (!d) return '1';
    const pend = d.trimestres.find((t) => Object.values(t.models).some((m) => m.estat === 'pendent'));
    if (pend) return String(pend.trimestre);
    const curs = d.trimestres.find((t) => t.models['303'].estat === 'en_curs');
    return curs ? String(curs.trimestre) : 'anual';
  }, [d]);
  const actiu = tab ?? tabPerDefecte;
  const trim = d?.trimestres.find((t) => String(t.trimestre) === actiu) ?? null;

  async function desaRefCad() {
    setRefMsg(null);
    try {
      await patchJSON('/api/impostos', { referenciaCadastral: refCad });
      setRefMsg('Desada');
      await load();
    } catch (e) {
      setRefMsg(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
    }
  }

  const estatTab = (ms: ModelInfo[]) =>
    ms.some((m) => m.estat === 'pendent') ? 'bg-amber-500' : ms.every((m) => m.estat === 'presentada' || m.estat === 'no_cal') && ms.some((m) => m.estat === 'presentada') ? 'bg-green-600' : 'bg-slate-300';

  return (
    <>
      <PageHeader
        title="Impostos"
        subtitle={d ? `${d.titular.cognoms} ${d.titular.nom} · NIF ${d.titular.nif} · calculat del Llibre d’IVA de cada trimestre` : 'Carregant…'}
        actions={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setTab(null); setAny(any - 1); }} aria-label="Any anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-14 text-center font-semibold">{any}</span>
            <Button size="sm" variant="ghost" onClick={() => { setTab(null); setAny(any + 1); }} aria-label="Any següent"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
      />

      {d && <AvisosBoe avisos={d.avisosBoe} onCanvi={load} />}

      {proper && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <CalendarClock className="h-4 w-4 shrink-0" />
          <span>
            <b>Proper termini: {dataCurta(proper.termini)}</b>
            {diesFins(proper.termini) >= 0 ? ` (${diesFins(proper.termini) === 0 ? 'avui' : `en ${diesFins(proper.termini)} dies`})` : ' (ja ha passat!)'} — {proper.quins.join(', ')}.
          </span>
        </div>
      )}

      {d && (
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
          {d.trimestres.map((t) => (
            <button
              key={t.trimestre}
              type="button"
              onClick={() => setTab(String(t.trimestre))}
              className={cn('flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold', actiu === String(t.trimestre) ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}
            >
              <span className={cn('h-2 w-2 rounded-full', estatTab(Object.values(t.models)))} />
              {t.trimestre}T
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTab('anual')}
            className={cn('flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold', actiu === 'anual' ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}
          >
            <span className={cn('h-2 w-2 rounded-full', estatTab(Object.values(d.anual)))} />
            Anual · 390 i 180
          </button>
        </div>
      )}

      {!d && <p className="text-sm text-slate-500">Calculant…</p>}

      {d && trim && (
        <>
          <OrigenDades t={trim} any={any} />
          {/* key per trimestre: en canviar de pestanya, les targetes es creen de nou
              (si no, l'estat d'una —p. ex. el resultat d'una presentació— passava a l'altra). */}
          <div key={`${any}-${trim.trimestre}`} className="grid gap-4 xl:grid-cols-3">
            <ModelCard m={trim.models['303']} any={any} onCanvi={load} />
            <ModelCard
              m={trim.models['130']}
              any={any}
              onCanvi={load}
              extra={
                <p className="mt-3 text-xs text-slate-500">
                  Les despeses van sense IVA i inclouen també els gastos que no en porten. La quota d’autònoms i la Seguretat Social resten si les entres com a gasto amb la categoria «Autònoms» o «Seguretat Social» (sense IVA).
                </p>
              }
            />
            <ModelCard
              m={trim.models['115']}
              any={any}
              onCanvi={load}
              extra={
                trim.totals.lloguer.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    Retencions dels gastos amb IRPF del trimestre ({[...new Set(trim.totals.lloguer.map((l) => l.nom))].join(', ')}). L’import ja te l’has quedat en pagar el lloguer: ara el passes a Hisenda.
                  </p>
                )
              }
            />
            {trim.ieet && <Ieet950Card t={trim.ieet} onCanvi={load} />}
          </div>
        </>
      )}

      {d && actiu === 'anual' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <ModelCard
            m={d.anual['390']}
            any={any}
            onCanvi={load}
            extra={
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p className="font-medium text-slate-700">Dades estadístiques (apartat 3)</p>
                <p>Activitat principal: servei d’hostalatge en hostals i pensions · Clau <b>A03</b> (resta d’activitats empresarials) · Epígraf IAE <b>682</b> (comprova’l a la teva alta censal).</p>
                <p className="mt-1">Els imports del 4T entren quan s’acabi l’any; fins llavors el 390 és provisional.</p>
              </div>
            }
          />
          <ModelCard
            m={d.anual['180']}
            any={any}
            onCanvi={load}
            extra={
              <div className="mt-3 space-y-3 text-xs text-slate-600">
                {d.anual['180'].perceptors.length > 0 && (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-1">Perceptor</th><th>NIF</th><th className="text-right">Base</th><th className="text-right">%</th><th className="text-right">Retenció</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.anual['180'].perceptors.map((p) => (
                        <tr key={p.nif || p.nom} className="border-t border-slate-100">
                          <td className="py-1">{p.nom}</td>
                          <td>{p.nif || <span className="italic text-orange-700">falta</span>}</td>
                          <td className="text-right tabular-nums">{formatEur(p.base)}</td>
                          <td className="text-right">{p.percent} %</td>
                          <td className="text-right tabular-nums">{formatEur(p.retencio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div>
                  <p className="mb-1 font-medium text-slate-700">Referència cadastral del local (obligatòria al 180)</p>
                  <div className="flex gap-2">
                    <Input className="h-8" placeholder="20 caràcters, la trobaràs al rebut de l’IBI" value={refCad} onChange={(e) => setRefCad(e.target.value.toUpperCase())} />
                    <Button size="sm" variant="outline" onClick={() => void desaRefCad()}>Desa</Button>
                  </div>
                  {refMsg && <p className="mt-1">{refMsg}</p>}
                  <p className="mt-1">Situació de l’immoble: <b>1</b> (amb referència cadastral, a territori comú). Modalitat: dinerària.</p>
                </div>
              </div>
            }
          />
          <div className="xl:col-span-2">
            <ModelCard m={d.anual['347']} any={any} onCanvi={load} extra={<Detall347 m={d.anual['347']} any={any} />} />
          </div>
          <RendaCard r={d.renda} any={any} />
          <Card className="xl:col-span-2">
            <CardBody className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-slate-700">
                <b>Taxa turística (model 950, ATC):</b> semestral, de l’1 al 20 d’octubre (abril–setembre) i de l’1 al 20 d’abril (octubre–març).
              </p>
              <Link href="/taxa-turistica"><Button size="sm" variant="outline">Obre la taxa turística</Button></Link>
            </CardBody>
          </Card>
        </div>
      )}

      {d && <CertificatAeatCard />}
    </>
  );
}
