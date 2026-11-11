'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarRange, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ApiError, getJSON, postJSON, putJSON } from '@/lib/api';
import { efecteAlBalanc, type EfecteMes } from '@/lib/repartiment';
import { formatDate, formatEur } from '@/lib/utils';
import type { PagamentPerRepartir } from '@/lib/services/repartiment-cobraments';

const mesNom = (iso: string) =>
  new Intl.DateTimeFormat('ca-ES', { month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

/** Llista de pagaments d'estades de més d'un mes que compten sencers en un sol mes. */
export function PerRepartirLlista({ inicial }: { inicial: PagamentPerRepartir[] }) {
  const router = useRouter();
  const [llista, setLlista] = useState(inicial);
  const [fets, setFets] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => setLlista(inicial), [inicial]);

  const [confirmant, setConfirmant] = useState(false);

  const pendents = llista.filter((p) => !fets.has(p.id));
  const automatics = pendents.filter((p) => p.automatic && p.proposta);
  const total = pendents.reduce((a, p) => a + p.import, 0);
  // Vista prèvia: com canvia cada mes del Balanç si es reparteixen els automàtics.
  const efecte = useMemo(
    () => efecteAlBalanc(automatics.map((p) => ({ data: p.data, import: p.import, proposta: p.proposta ?? [] }))),
    [automatics],
  );

  async function reparteix(p: PagamentPerRepartir) {
    if (!p.proposta) return;
    setBusy(p.id);
    setMsg(null);
    try {
      // Es desa exactament el repartiment que es veu a la pantalla.
      await putJSON(`/api/cobraments/${p.id}/periodes`, { periodes: p.proposta });
      setFets((s) => new Set(s).add(p.id));
    } catch (e) {
      setMsg({ ok: false, text: `${p.titular}: ${e instanceof ApiError || e instanceof Error ? e.message : 'error'}` });
    } finally {
      setBusy(null);
    }
  }

  async function reparteixTots() {
    setBusy('TOTS');
    setMsg(null);
    try {
      const r = await postJSON<{ fets: number; errors: string[] }>('/api/cobraments/per-repartir', {});
      setMsg({
        ok: r.errors.length === 0,
        text:
          `Fet: ${r.fets} ${r.fets === 1 ? 'pagament repartit' : 'pagaments repartits'}.` +
          (r.errors.length ? ` No s’han pogut fer: ${r.errors.join(' · ')}` : ''),
      });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'No s’ha pogut repartir.' });
    } finally {
      setBusy(null);
    }
  }

  if (llista.length === 0) {
    return (
      <Card>
        <CardBody className="flex items-center gap-2 text-sm text-green-800">
          <Check className="h-4 w-4" /> Tots els pagaments d’estades de més d’un mes ja estan repartits.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span>
          <strong>
            {pendents.length} {pendents.length === 1 ? 'pagament' : 'pagaments'} per repartir
          </strong>{' '}
          · {formatEur(total)} comptats sencers en un sol mes
        </span>
        {automatics.length > 0 && (
          <Button onClick={() => setConfirmant(true)} disabled={busy !== null} className="w-full sm:w-auto">
            <CalendarRange className="h-4 w-4" />
            {busy === 'TOTS' ? 'Repartint…' : `Reparteix-ne ${automatics.length} automàticament`}
          </Button>
        )}
      </div>

      {/* Vista prèvia: res no canvia fins que es confirma. */}
      {efecte.length > 0 && (
        <Card>
          <CardBody className="space-y-2 px-4 sm:px-5">
            <p className="text-sm font-semibold text-slate-800">
              Com quedarà el Balanç si reparteixes els {automatics.length} automàtics
            </p>
            <p className="text-xs text-slate-500">
              Vista prèvia: encara no s’ha canviat res. Només compten aquests pagaments; la resta del mes no es toca.
            </p>
            <EfecteTaula efecte={efecte} />
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={confirmant}
        danger={false}
        title={`Repartir ${automatics.length} pagaments per mesos`}
        message="Cada pagament comptarà al Balanç repartit entre els mesos de la seva estada, tal com es veu a la llista. Les factures no canvien i es pot desfer pagament per pagament («Canviar» → «Treure el repartiment»)."
        confirmLabel="Sí, reparteix-los"
        extra={
          <div className="mt-4">
            <EfecteTaula efecte={efecte} />
          </div>
        }
        onCancel={() => setConfirmant(false)}
        onConfirm={() => {
          setConfirmant(false);
          void reparteixTots();
        }}
      />

      {msg && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
        >
          {msg.text}
        </p>
      )}

      <div className="space-y-2">
        {llista.map((p) => {
          const fet = fets.has(p.id);
          return (
            <Card key={p.id} className={fet ? 'opacity-60' : undefined}>
              <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm sm:px-5">
                <div className="min-w-[11rem] flex-1">
                  <p className="font-semibold text-slate-900">{p.titular}</p>
                  <p className="text-xs text-slate-500">
                    {p.contracte ? `Contracte ${p.contracte}` : 'Sense contracte'}
                    {p.facturaNumero ? ` · factura ${p.facturaNumero}` : ' · a compte'}
                  </p>
                </div>
                <div className="min-w-[11rem]">
                  <p className="text-slate-800">
                    {formatDate(p.entrada)} – {formatDate(p.sortida)}
                  </p>
                  <p className="text-xs text-slate-500">{p.nitsPerMes}</p>
                </div>
                <div className="min-w-[9rem]">
                  <p className="font-semibold text-slate-900">{formatEur(p.import)}</p>
                  <p className="text-xs text-amber-700">
                    cobrat el {formatDate(p.data)} · ara tot al {mesNom(p.data)}
                  </p>
                </div>
                {p.proposta && !fet && (
                  <div className="basis-full rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Quedarà: </span>
                    {p.proposta
                      .map((x) => `${mesNom(x.dataInici)} ${formatEur(x.import)} (${x.nits} ${x.nits === 1 ? 'nit' : 'nits'})`)
                      .join(' · ')}
                  </div>
                )}
                <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
                  {fet ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                      <Check className="h-4 w-4" /> Repartit
                    </span>
                  ) : p.automatic && p.proposta ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void reparteix(p)}
                      disabled={busy !== null}
                      className="h-10 flex-1 sm:h-8 sm:flex-none"
                    >
                      {busy === p.id ? 'Repartint…' : 'Repartir'}
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500" title="Cal decidir a mà a quins mesos va (botó «Repartir per mesos» a l’estada)">
                      {p.automatic
                        ? 'No s’ha pogut proposar · fes-ho des de l’estada'
                        : `${p.pagamentsEstada} pagaments a l’estada · revisa’l a mà`}
                    </span>
                  )}
                  <Link
                    href={`/estancies/${p.estanciaId}`}
                    className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-700 hover:underline sm:h-8"
                  >
                    Estada <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** Taula «Mes · Ara · Quedarà» de la vista prèvia. */
function EfecteTaula({ efecte }: { efecte: EfecteMes[] }) {
  const nomMes = (mes: string) =>
    new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${mes}-01T00:00:00Z`),
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[18rem] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <th className="py-1 pr-3 font-bold">Mes</th>
            <th className="py-1 pr-3 text-right font-bold">Ara</th>
            <th className="py-1 pr-3 text-right font-bold">Quedarà</th>
            <th className="py-1 text-right font-bold">Canvi</th>
          </tr>
        </thead>
        <tbody>
          {efecte.map((e) => {
            const dif = Math.round((e.despres - e.ara) * 100) / 100;
            return (
              <tr key={e.mes} className="border-t border-slate-100">
                <td className="py-1.5 pr-3 capitalize text-slate-800">{nomMes(e.mes)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600">{formatEur(e.ara)}</td>
                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-slate-900">{formatEur(e.despres)}</td>
                <td className={`py-1.5 text-right font-semibold tabular-nums ${dif > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {dif > 0 ? '+' : '−'}
                  {formatEur(Math.abs(dif))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Avís al Balanç si hi ha pagaments per repartir (enllaça a /balanc/repartir). */
export function AvisPerRepartir() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cancel = false;
    getJSON<PagamentPerRepartir[]>('/api/cobraments/per-repartir')
      .then((r) => !cancel && setN(r.length))
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);
  if (n === 0) return null;
  return (
    <Link
      href="/balanc/repartir"
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
    >
      <span>
        <strong>
          {n} {n === 1 ? 'pagament compta' : 'pagaments compten'} sencer{n === 1 ? '' : 's'} en un sol mes
        </strong>{' '}
        tot i que l’estada n’ocupa més d’un.
      </span>
      <span className="font-semibold underline">Repartir-los per mesos</span>
    </Link>
  );
}
