'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, CloudUpload } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { getJSON, postJSON, ApiError } from '@/lib/api';
import { formatEur, cn } from '@/lib/utils';
import { TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';
import type { FilaIeet, ResumIeet, ConfigIeet } from '@/lib/ieet';

interface Dades {
  any: number;
  config: ConfigIeet;
  files: FilaIeet[];
  resum: ResumIeet[];
  drive: { at: string; ok: boolean } | null;
}

const TRIMS = [1, 2, 3, 4] as const;
const NOM_TRIM: Record<number, string> = { 1: '1r trim.', 2: '2n trim.', 3: '3r trim.', 4: '4t trim.' };

const dataCurta = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

function quanFa(at: string): string {
  const d = new Date(at);
  const avui = new Date();
  const hora = d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === avui.toDateString()) return `avui a les ${hora}`;
  return `${d.toLocaleDateString('ca-ES')} a les ${hora}`;
}

/** Cel·la que es pinta de taronja quan la dada falta a la fitxa. */
function Cel({ falta, children, className }: { falta?: boolean; children: React.ReactNode; className?: string }) {
  return <Td className={cn('whitespace-nowrap', falta && 'bg-orange-100 italic text-orange-800', className)}>{falta ? 'falta' : children}</Td>;
}

export default function TaxaTuristicaPage() {
  const router = useRouter();
  const avui = new Date();
  const [any, setAny] = useState(avui.getFullYear());
  const [trim, setTrim] = useState<number | null>(Math.floor(avui.getMonth() / 3) + 1);
  const [d, setD] = useState<Dades | null>(null);
  const [sync, setSync] = useState<{ busy: boolean; msg: string | null; err: boolean }>({ busy: false, msg: null, err: false });

  const load = useCallback(async () => {
    setD(await getJSON<Dades>(`/api/ieet?any=${any}`));
  }, [any]);
  useEffect(() => { void load(); }, [load]);

  async function actualitzaDrive() {
    setSync({ busy: true, msg: null, err: false });
    try {
      const r = await postJSON<{ ok: boolean; fitxer: string | null; error: string | null }>('/api/ieet/drive', { any });
      setSync({ busy: false, msg: r.ok ? `Actualitzat: ${r.fitxer}` : r.error ?? 'No s’ha pogut actualitzar', err: !r.ok });
      await load();
    } catch (e) {
      setSync({ busy: false, msg: e instanceof ApiError ? e.message : 'No s’ha pogut actualitzar', err: true });
    }
  }

  const files = d ? d.files.filter((f) => trim === null || f.trimestre === `${any}-T${trim}`) : [];
  const paguen = files.filter((f) => f.import > 0);
  const nits = paguen.reduce((a, f) => a + f.nitsPaguen, 0);
  const total = Math.round(paguen.reduce((a, f) => a + f.import, 0) * 100) / 100;
  const incompletes = files.filter((f) => f.falten.length > 0).length;
  const falta = (f: FilaIeet, camp: string) => f.falten.includes(camp);

  return (
    <>
      <PageHeader
        title="Taxa turística (IEET)"
        subtitle="Persones de les estades ja acabades, amb número de contracte. Només compta la primera estada."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setAny(any - 1)} aria-label="Any anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-12 text-center font-semibold tabular-nums">{any}</span>
            <Button size="sm" variant="ghost" onClick={() => setAny(any + 1)} aria-label="Any següent"><ChevronRight className="h-4 w-4" /></Button>
            {TRIMS.map((t) => (
              <Button key={t} size="sm" variant={trim === t ? 'primary' : 'outline'} onClick={() => setTrim(t)}>{NOM_TRIM[t]}</Button>
            ))}
            <Button size="sm" variant={trim === null ? 'primary' : 'outline'} onClick={() => setTrim(null)}>Tot l’any</Button>
          </div>
        }
      />

      {!d ? (
        <p className="text-sm text-slate-400">Carregant…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Persones" value={String(files.length)} />
            <Stat label="Nits que paguen" value={String(nits)} />
            <Stat label="Import a declarar" value={formatEur(total)} />
            <Stat label="Fitxes amb dades que falten" value={String(incompletes)} warn={incompletes > 0} />
          </div>

          <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3', d.drive?.ok === false ? 'bg-amber-50' : 'bg-green-50')}>
            <div className="text-sm">
              <span className={cn('font-semibold', d.drive?.ok === false ? 'text-amber-800' : 'text-green-800')}>
                {d.drive ? (d.drive.ok ? 'Sincronitzat amb Google Drive' : 'L’última sincronització amb Drive va fallar') : 'Encara no s’ha pujat mai a Drive'}
              </span>
              {d.drive && <span className="text-slate-600"> · {quanFa(d.drive.at)}</span>}
              <div className="text-xs text-slate-500">Hostal Coll — Gestió / {any} / Taxa turística {any}.xlsx · s’actualitza sol cada matí</div>
              {sync.msg && <div className={cn('text-xs', sync.err ? 'text-red-600' : 'text-green-700')}>{sync.msg}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/ieet/export?any=${any}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-600">
                <Download className="h-4 w-4" /> Descarregar Excel
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
                  <Th className="text-right">Import</Th><Th>Trimestre</Th>
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
                    <Cel>{f.trimestre}</Cel>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          <p className="text-xs text-slate-500">
            {formatEur(d.config.tarifa)} per persona i nit · màxim {d.config.maxNits} nits per primera estada · paguen a partir de {d.config.edatMinima} anys (es canvia a Configuració).
            Les continuacions i ampliacions no surten perquè no paguen. Clica una fila per completar la fitxa del viatger.
          </p>
        </div>
      )}
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
