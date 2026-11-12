'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus, Printer, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { NavegadorPeriode } from '@/components/ui/navegador-periode';
import { Eur, HideAmountsButton } from '@/components/finances/amounts-visibility';
import { ApiError, delJSON, getJSON, postJSON } from '@/lib/api';
import { toISODate } from '@/lib/dates';
import { rangDeEstat, type EstatPeriode } from '@/lib/periode';
import { cn } from '@/lib/utils';
import { NOM_COMPTE, type CompteTresoreria, type RegistreCompte, type TipusMovimentTresoreria } from '@/lib/tresoreria';
import type { RegistreTresoreria } from '@/lib/services/tresoreria';

/** `YYYY-MM-DD` → `dd/mm/aaaa`. */
const dataLlarga = (d: string) => d.split('-').reverse().join('/');

const SUBTITOL: Record<CompteTresoreria, string> = {
  BANC: 'Targeta, transferència i Bizum',
  CAIXA: 'Efectiu de recepció',
};

function RegistreCard({ r, desde, onTreu }: { r: RegistreCompte; desde: string; onTreu: (id: string) => void }) {
  return (
    <Card className="break-inside-avoid print:border-0 print:shadow-none">
      <CardHeader className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <CardTitle>{NOM_COMPTE[r.compte]}</CardTitle>
          <p className="text-xs text-slate-500">{SUBTITOL[r.compte]}</p>
        </div>
        <p className="text-sm text-slate-600">
          Saldo inicial: <Eur value={r.saldoInicial} className="font-semibold text-slate-900 tabular-nums" />
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {!r.ambSaldoInicial && (
          <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Falta el saldo inicial: el saldo parteix de 0 i no serà el real. Afegeix-lo a sota amb «Saldo inicial» (els diners que hi havia un dia concret).
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b-[1.5px] border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2 font-semibold">Data</th>
                <th className="py-2 pr-2 font-semibold">Concepte / referència</th>
                <th className="py-2 pr-2 text-right font-semibold">Deure</th>
                <th className="py-2 pr-2 text-right font-semibold">Haver</th>
                <th className="py-2 text-right font-semibold">Saldo</th>
                <th className="w-8 print:hidden" aria-label="Accions" />
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 text-slate-500">
                <td className="py-2 pr-2 tabular-nums">{dataLlarga(desde)}</td>
                <td className="py-2 pr-2 italic">Saldo inicial</td>
                <td />
                <td />
                <td className="py-2 text-right font-semibold tabular-nums text-slate-900"><Eur value={r.saldoInicial} /></td>
                <td className="print:hidden" />
              </tr>
              {r.files.map((f, i) => (
                <tr key={`${f.id}-${i}`} className={cn('border-b border-slate-100', f.origen === 'SALDO_INICIAL' && 'bg-slate-50 text-slate-500')}>
                  <td className="whitespace-nowrap py-2 pr-2 tabular-nums">{dataLlarga(f.dia)}</td>
                  <td className="py-2 pr-2">
                    {f.href ? (
                      <Link href={f.href} className="text-slate-800 hover:text-brand-700 hover:underline">{f.concepte}</Link>
                    ) : (
                      <span className={cn(f.origen === 'SALDO_INICIAL' ? 'italic' : 'text-slate-800')}>{f.concepte}</span>
                    )}
                    {f.referencia && <span className="text-slate-500"> · {f.referencia}</span>}
                    {f.origen === 'MANUAL' && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">a mà</span>}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-green-800">{f.deure != null && <Eur value={f.deure} />}</td>
                  <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-brand-800">{f.haver != null && <Eur value={f.haver} />}</td>
                  <td className={cn('whitespace-nowrap py-2 text-right font-semibold tabular-nums', f.saldo < 0 ? 'text-red-700' : 'text-slate-900')}>
                    <Eur value={f.saldo} />
                  </td>
                  <td className="text-right print:hidden">
                    {(f.origen === 'MANUAL' || f.origen === 'SALDO_INICIAL') && (
                      <button
                        type="button"
                        onClick={() => onTreu(f.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700"
                        aria-label="Treure aquest moviment"
                        title="Treure aquest moviment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {r.files.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm italic text-slate-400">Cap moviment en aquest període</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-[1.5px] border-slate-800 font-semibold text-slate-900">
                <td colSpan={2} className="py-2 pr-2 text-right text-[11px] uppercase tracking-wide">Total…</td>
                <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-green-800"><Eur value={r.totalDeure} /></td>
                <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-brand-800"><Eur value={r.totalHaver} /></td>
                <td className="whitespace-nowrap py-2 text-right tabular-nums"><Eur value={r.saldoFinal} /></td>
                <td className="print:hidden" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Saldo inicial</p>
            <Eur value={r.saldoInicial} className="font-serif text-xl tabular-nums text-slate-900" />
          </div>
          <div className="rounded-lg bg-green-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-green-800">+ Total Deure (entrades)</p>
            <Eur value={r.totalDeure} className="font-serif text-xl tabular-nums text-green-900" />
          </div>
          <div className="rounded-lg bg-brand-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">− Total Haver (sortides)</p>
            <Eur value={r.totalHaver} className="font-serif text-xl tabular-nums text-brand-800" />
          </div>
          <div className="rounded-lg bg-slate-800 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">= Saldo final</p>
            <Eur value={r.saldoFinal} className="font-serif text-xl tabular-nums text-white" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

const TIPUS_ETIQUETA: Record<TipusMovimentTresoreria, string> = {
  SALDO_INICIAL: 'Saldo inicial (arqueig)',
  TRASPAS: 'Traspàs entre caixa i banc',
  ENTRADA: 'Altra entrada de diners',
  SORTIDA: 'Altra sortida de diners',
};

function NouMoviment({ avui, onFet }: { avui: string; onFet: () => Promise<void> }) {
  const [tipus, setTipus] = useState<TipusMovimentTresoreria>('SALDO_INICIAL');
  const [compte, setCompte] = useState<CompteTresoreria>('BANC');
  const [data, setData] = useState(avui);
  const [imp, setImp] = useState('');
  const [concepte, setConcepte] = useState('');
  const [referencia, setReferencia] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function desa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const n = Number(imp.replace(/\./g, '').replace(',', '.'));
      if (!imp.trim() || Number.isNaN(n)) throw new ApiError('Escriu l’import', 400);
      await postJSON('/api/tresoreria', { tipus, compte, data, import: n, concepte, referencia: referencia || null });
      setImp('');
      setConcepte('');
      setReferencia('');
      await onFet();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No s’ha pogut desar');
    } finally {
      setBusy(false);
    }
  }

  const etiquetaCompte = tipus === 'TRASPAS' ? 'Direcció' : 'Compte';
  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>Afegeix un moviment a mà</CardTitle>
        <p className="text-xs text-slate-500">
          Els pagaments de les estades, els dipòsits i les despeses ja hi surten sols. A mà només cal el saldo inicial, portar efectiu al banc i el que no passi per l’app (per exemple, els pagaments al personal).
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={(e) => void desa(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Tipus" htmlFor="mt-tipus" className="lg:col-span-2">
            <Select id="mt-tipus" value={tipus} onChange={(e) => setTipus(e.target.value as TipusMovimentTresoreria)}>
              {(Object.keys(TIPUS_ETIQUETA) as TipusMovimentTresoreria[]).map((t) => (
                <option key={t} value={t}>{TIPUS_ETIQUETA[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label={etiquetaCompte} htmlFor="mt-compte">
            <Select id="mt-compte" value={compte} onChange={(e) => setCompte(e.target.value as CompteTresoreria)}>
              {tipus === 'TRASPAS' ? (
                <>
                  <option value="CAIXA">Caixa → banc</option>
                  <option value="BANC">Banc → caixa</option>
                </>
              ) : (
                <>
                  <option value="BANC">Banc</option>
                  <option value="CAIXA">Caixa</option>
                </>
              )}
            </Select>
          </Field>
          <Field label="Data" htmlFor="mt-data">
            <Input id="mt-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Field>
          <Field label={tipus === 'SALDO_INICIAL' ? 'Diners que hi havia (€)' : 'Import (€)'} htmlFor="mt-import" className="lg:col-span-2">
            <Input id="mt-import" inputMode="decimal" value={imp} onChange={(e) => setImp(e.target.value)} placeholder="0,00" className="text-right tabular-nums" />
          </Field>
          <Field label={tipus === 'ENTRADA' || tipus === 'SORTIDA' ? 'Concepte' : 'Concepte (opcional)'} htmlFor="mt-concepte" className="lg:col-span-3">
            <Input id="mt-concepte" value={concepte} onChange={(e) => setConcepte(e.target.value)} maxLength={200} />
          </Field>
          <Field label="Referència (opcional)" htmlFor="mt-ref" className="lg:col-span-2">
            <Input id="mt-ref" value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100} placeholder="Nº de rebut, tiquet…" />
          </Field>
          <div className="flex items-end lg:col-span-1">
            <Button type="submit" disabled={busy} className="w-full"><Plus className="h-4 w-4" /> Afegeix</Button>
          </div>
          {tipus === 'SALDO_INICIAL' && (
            <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-6">
              Compta al començar el dia triat: els moviments d’aquell dia s’hi sumen després. Pots posar-ne un altre més endavant per quadrar amb un arqueig o amb l’extracte.
            </p>
          )}
          {err && <p className="text-sm text-red-700 sm:col-span-2 lg:col-span-6">{err}</p>}
        </form>
      </CardBody>
    </Card>
  );
}

export default function DeureHaverPage() {
  const avui = toISODate(new Date());
  const [estat, setEstat] = useState<EstatPeriode>({ tipus: 'mes', off: 0 });
  const { desde, fins } = rangDeEstat(estat, avui);
  const [d, setD] = useState<RegistreTresoreria | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      setD(await getJSON<RegistreTresoreria>(`/api/tresoreria?desde=${desde}&fins=${fins}`));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut carregar');
    }
  }, [desde, fins]);
  useEffect(() => { void load(); }, [load]);

  async function treu(id: string) {
    if (!confirm('Vols treure aquest moviment entrat a mà?')) return;
    await delJSON(`/api/tresoreria/${id}`);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Deure i Haver"
        subtitle="Registre de la caixa i del banc: el Deure és el que entra, l’Haver el que surt."
        actions={<Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4" /> Imprimeix</Button>}
      />
      <div className="print:hidden"><FinancesNav /></div>

      <div className="mb-4 print:hidden">
        <NavegadorPeriode estat={estat} onChange={setEstat} avui={avui} extra={<HideAmountsButton />} />
      </div>
      <p className="mb-4 hidden text-sm font-semibold print:block">Període: del {dataLlarga(desde)} al {dataLlarga(fins)}</p>

      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
      {!d && !err && <p className="text-sm text-slate-500">Carregant…</p>}

      {d && (
        <div className="space-y-6">
          {d.senseCompte.n > 0 && (
            <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {d.senseCompte.n} {d.senseCompte.n === 1 ? 'moviment té' : 'moviments tenen'} la forma de pagament «Altres» (<Eur value={d.senseCompte.import} />) i no surten enlloc: no se sap si van a la caixa o al banc. Canvia’ls la forma de pagament perquè hi entrin.
            </p>
          )}
          {d.comptes.map((r) => (
            <RegistreCard key={r.compte} r={r} desde={d.desde} onTreu={(id) => void treu(id)} />
          ))}
          <NouMoviment avui={avui} onFet={load} />
          <p className="text-xs text-slate-500">
            Els imports porten l’IVA inclòs (són els diners que es mouen). Per als impostos mana el llibre d’IVA. Un traspàs entre caixa i banc no és cap ingrés ni cap despesa. A l’extracte del banc els costats surten al revés, perquè el banc ho mira des del seu costat.
          </p>
        </div>
      )}
    </>
  );
}
