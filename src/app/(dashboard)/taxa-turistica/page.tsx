'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, CloudUpload, CalendarClock, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { getJSON, postJSON, ApiError } from '@/lib/api';
import { formatEur, cn } from '@/lib/utils';
import { TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';
import { infoPeriode, periodeAnterior, periodePerDefecte, periodeSeguent, type FilaIeet, type ResumIeet, type ConfigIeet, type PeriodeIeet } from '@/lib/ieet';

interface Dades {
  periode: PeriodeIeet;
  config: ConfigIeet;
  files: FilaIeet[];
  resum: ResumIeet;
  drive: { at: string; ok: boolean; error: string | null } | null;
}

const dataCurta = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const avuiIso = () => new Date().toISOString().slice(0, 10);
const diesFins = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${avuiIso()}T00:00:00Z`)) / 86_400_000);

function quanFa(at: string): string {
  const d = new Date(at);
  const hora = d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? `avui a les ${hora}` : `${d.toLocaleDateString('ca-ES')} a les ${hora}`;
}

/** Estat del període respecte del termini de pagament (1–20 d'octubre / d'abril). */
function terminiPagament(p: PeriodeIeet): { tone: 'warn' | 'info' | 'ok'; text: string } {
  const avui = avuiIso();
  const termini = `de l’${dataCurta(p.pagamentDes)} al ${dataCurta(p.pagamentFins)}`;
  if (avui <= p.fi) return { tone: 'info', text: `Període en curs. Es pagarà ${termini}.` };
  if (avui < p.pagamentDes) return { tone: 'info', text: `Període tancat. Es paga ${termini}.` };
  if (avui <= p.pagamentFins) {
    const n = diesFins(p.pagamentFins);
    return { tone: 'warn', text: `Toca pagar ara: ${termini} · ${n === 0 ? 'avui és l’últim dia' : `queden ${n} dies`}.` };
  }
  return { tone: 'ok', text: `El termini de pagament (${termini}) ja ha passat.` };
}

/** Cel·la que es pinta de taronja quan la dada falta a la fitxa. */
function Cel({ falta, children, className }: { falta?: boolean; children: React.ReactNode; className?: string }) {
  return <Td className={cn('whitespace-nowrap', falta && 'bg-orange-100 italic text-orange-800', className)}>{falta ? 'falta' : children}</Td>;
}

export default function TaxaTuristicaPage() {
  const router = useRouter();
  const [clau, setClau] = useState(() => periodePerDefecte(new Date()));
  const [d, setD] = useState<Dades | null>(null);
  const [sync, setSync] = useState<{ busy: boolean; msg: string | null; err: boolean }>({ busy: false, msg: null, err: false });

  const load = useCallback(async () => {
    setD(await getJSON<Dades>(`/api/ieet?periode=${clau}`));
  }, [clau]);
  useEffect(() => { setD(null); void load(); }, [load]);

  async function actualitzaDrive() {
    setSync({ busy: true, msg: null, err: false });
    try {
      const r = await postJSON<{ ok: boolean; fitxer: string | null; error: string | null }>('/api/ieet/drive', { periode: clau });
      setSync({ busy: false, msg: r.ok ? `Actualitzat: ${r.fitxer}` : r.error ?? 'No s’ha pogut actualitzar', err: !r.ok });
      await load();
    } catch (e) {
      setSync({ busy: false, msg: e instanceof ApiError ? e.message : 'No s’ha pogut actualitzar', err: true });
    }
  }

  const info = infoPeriode(clau);
  const termini = terminiPagament(info);
  const files = d?.files ?? [];
  const incompletes = files.filter((f) => f.falten.length > 0).length;
  const falta = (f: FilaIeet, camp: string) => f.falten.includes(camp);

  return (
    <>
      <PageHeader
        title="Taxa turística (IEET)"
        subtitle="Persones de les estades ja acabades, amb número de contracte. Només compta la primera estada."
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setClau(periodeAnterior(clau))} aria-label="Període anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-52 text-center font-semibold">{info.etiqueta}</span>
            <Button size="sm" variant="ghost" onClick={() => setClau(periodeSeguent(clau))} aria-label="Període següent"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className={cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 text-sm',
          termini.tone === 'warn' ? 'bg-amber-50 text-amber-900' : termini.tone === 'ok' ? 'bg-slate-50 text-slate-600' : 'bg-brand-50 text-brand-900',
        )}>
          <CalendarClock className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-semibold">{info.etiqueta}</span> · estades amb entrada del {dataCurta(info.inici)} al {dataCurta(info.fi)}.{' '}
            {termini.text}
          </div>
        </div>

        {!d ? (
          <p className="text-sm text-slate-400">Carregant…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Persones" value={String(d.resum.persones)} />
              <Stat label="Nits que paguen" value={String(d.resum.nitsPaguen)} />
              <Stat label="Import a pagar" value={formatEur(d.resum.import)} />
              <Stat label="Fitxes amb dades que falten" value={String(incompletes)} warn={incompletes > 0} />
            </div>

            <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3', d.drive?.ok === false ? 'bg-amber-50' : 'bg-green-50')}>
              <div className="text-sm">
                <span className={cn('font-semibold', d.drive?.ok === false ? 'text-amber-800' : 'text-green-800')}>
                  {d.drive ? (d.drive.ok ? 'Sincronitzat amb Google Drive' : 'L’última sincronització amb Drive va fallar') : 'Encara no s’ha pujat mai a Drive'}
                </span>
                {d.drive && <span className="text-slate-600"> · {quanFa(d.drive.at)}</span>}
                <div className="text-xs text-slate-500">
                  Hostal Coll — Gestió / {clau.slice(0, 4)} / Taxa turística {info.etiqueta.replace(' – ', '-')}.xlsx · s’actualitza sol cada matí
                </div>
                {d.drive && !d.drive.ok && d.drive.error && !sync.msg && <div className="text-xs text-amber-800">{d.drive.error}</div>}
                {sync.msg && <div className={cn('text-xs', sync.err ? 'text-red-600' : 'text-green-700')}>{sync.msg}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/ieet/export?periode=${clau}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-600">
                  <Download className="h-4 w-4" /> Descarregar Excel
                </a>
                <a href={`/api/ieet/pdf?periode=${clau}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-600">
                  <FileText className="h-4 w-4" /> Descarregar PDF
                </a>
                <Button size="sm" onClick={actualitzaDrive} disabled={sync.busy}>
                  <CloudUpload className="h-4 w-4" /> {sync.busy ? 'Actualitzant…' : 'Actualitzar Drive ara'}
                </Button>
              </div>
            </div>

            {files.length === 0 ? (
              <EmptyState>Cap estada acabada amb contracte en aquest període.</EmptyState>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Estat</Th><Th>Contracte</Th><Th>Habitació</Th><Th>Entrada</Th><Th>Sortida</Th>
                    <Th className="text-right">Nits estada</Th><Th className="text-right">Nits que paguen</Th>
                    <Th>Cognoms i nom</Th><Th>Tipus doc.</Th><Th>Núm. document</Th><Th>Nacionalitat</Th>
                    <Th>Data naixement</Th><Th className="text-right">Edat</Th><Th>Domicili</Th><Th>CP</Th>
                    <Th>Municipi</Th><Th>País</Th><Th>Telèfon</Th><Th>Correu electrònic</Th>
                    <Th className="text-right">Import</Th>
                  </tr>
                </Thead>
                <tbody>
                  {files.map((f) => (
                    <Tr
                      key={`${f.estadaId}-${f.huespedId}`}
                      className="cursor-pointer hover:bg-brand-50/40"
                      onClick={() => router.push(`/huespedes/${f.huespedId}`)}
                      title="Obrir la fitxa del viatger"
                    >
                      <Td className="whitespace-nowrap">
                        {f.menor ? (
                          <Badge tone="info">Menor de {d.config.edatMinima}</Badge>
                        ) : f.falten.length > 0 ? (
                          <Badge tone="warning">Falta {f.falten.join(', ')}</Badge>
                        ) : (
                          <Badge tone="success">Completa</Badge>
                        )}
                      </Td>
                      <Cel>{f.contracte}</Cel>
                      <Cel falta={falta(f, 'habitació')}>{f.habitacio}</Cel>
                      <Cel>{dataCurta(f.entrada)}</Cel>
                      <Cel>{dataCurta(f.sortida)}</Cel>
                      <Cel className="text-right tabular-nums">{f.nitsEstada}</Cel>
                      <Cel className="text-right tabular-nums">{f.nitsPaguen}</Cel>
                      <Cel className="font-medium text-slate-800">{f.nom}</Cel>
                      <Cel falta={falta(f, 'document')}>{f.tipusDocument ? TIPUS_DOCUMENT_LABELS[f.tipusDocument as keyof typeof TIPUS_DOCUMENT_LABELS] ?? f.tipusDocument : ''}</Cel>
                      <Cel falta={falta(f, 'document')}>{f.numDocument}</Cel>
                      <Cel falta={falta(f, 'nacionalitat')}>{f.nacionalitat}</Cel>
                      <Cel falta={falta(f, 'data de naixement')}>{dataCurta(f.dataNaixement)}</Cel>
                      <Cel className="text-right tabular-nums">{f.edat ?? ''}</Cel>
                      <Cel falta={falta(f, 'domicili')}>{f.adreca}</Cel>
                      <Cel>{f.codiPostal}</Cel>
                      <Cel falta={falta(f, 'municipi')}>{f.municipi}</Cel>
                      <Cel falta={falta(f, 'país')}>{f.pais}</Cel>
                      <Cel falta={falta(f, 'telèfon')}>{f.telefon}</Cel>
                      <Cel falta={falta(f, 'correu')}>{f.email}</Cel>
                      <Cel className="text-right font-medium tabular-nums">{formatEur(f.import)}</Cel>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
            <p className="text-xs text-slate-500">
              {formatEur(d.config.tarifa)} per persona i nit · màxim {d.config.maxNits} nits per primera estada · paguen a partir de {d.config.edatMinima} anys (es canvia a Configuració).
              Les continuacions i ampliacions no surten perquè no paguen. Clica una fila per completar la fitxa del viatger.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3', warn ? 'border-transparent bg-amber-50' : 'border-slate-200 bg-white')}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn('font-serif text-3xl font-semibold tabular-nums', warn && 'text-amber-700')}>{value}</div>
    </div>
  );
}
