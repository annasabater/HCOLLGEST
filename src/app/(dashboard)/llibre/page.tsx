'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Eye, AlertTriangle, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EliminarEstada } from '@/components/estancia/eliminar-estada';
import { ESTAT_ENVIAMENT_LABELS } from '@/lib/validation/enums';
import { getJSON } from '@/lib/api';
import type { EstatEnviament } from '@prisma/client';

interface Row {
  estanciaId: string;
  enviamentEstat: string;
  numContracte: string;
  dataEntrada: string;
  dataSortida: string;
  nom: string;
  cognom1: string;
  cognom2: string;
  tipusDocument: string;
  numDocument: string;
  municipi: string;
  mascotes: string;
}

function estatBadge(estat: string) {
  if (!estat) return <Badge tone="neutral">No comunicat</Badge>;
  const tone =
    estat === 'ACCEPTAT'
      ? 'success'
      : estat === 'ENVIAT'
        ? 'info'
        : estat === 'PENDENT'
          ? 'warning'
          : 'danger';
  return <Badge tone={tone}>{ESTAT_ENVIAMENT_LABELS[estat as EstatEnviament] ?? estat}</Badge>;
}

const PER_PAGINA_OPTS = [10, 25, 50];

export default function LlibrePage() {
  const [desde, setDesde] = useState('');
  const [fins, setFins] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [nomesMascota, setNomesMascota] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [perPagina, setPerPagina] = useState(25);

  const query = () => {
    const p = new URLSearchParams();
    if (desde) p.set('desde', desde);
    if (fins) p.set('fins', fins);
    return p.toString();
  };

  async function veure() {
    setLoading(true);
    try {
      const res = await getJSON<{ rows: Row[] }>(`/api/llibre?${query()}`);
      setRows(res.rows);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const p = new URLSearchParams(query());
    p.set('format', 'csv');
    window.open(`/api/llibre?${p.toString()}`, '_blank');
  }

  // Carrega TOT el llibre automàticament en obrir la pàgina (sense filtre de dates).
  // Els camps de data segueixen servint per acotar i tornar a prémer «Veure».
  useEffect(() => {
    veure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Les accions (editar / enviar a Mossos) són per estada: només es mostren al
  // primer viatger de cada contracte per no duplicar-les ni generar fitxers repetits.
  const visibles = useMemo(() => (rows ?? []).filter(
    (r) => !nomesMascota || (!!r.mascotes && r.mascotes.trim() !== '' && r.mascotes !== '—'),
  ), [rows, nomesMascota]);

  const totalPagines = Math.ceil(visibles.length / perPagina);
  const paginats = visibles.slice((pagina - 1) * perPagina, pagina * perPagina);

  const firstRowOf = new Map<string, number>();
  const groupOf = new Map<string, number>();
  let groupIdx = 0;
  visibles.forEach((r, i) => {
    if (!firstRowOf.has(r.estanciaId)) {
      firstRowOf.set(r.estanciaId, i);
      groupOf.set(r.estanciaId, groupIdx++);
    }
  });

  return (
    <div>
      <PageHeader
        title="Llibre de registre"
        subtitle="Export del registre de viatgers · conservar 3 anys"
        actions={
          <Link href="/avisos">
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4" /> Avisos interns
            </Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Des de">
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </Field>
          <Field label="Fins a">
            <Input type="date" value={fins} onChange={(e) => setFins(e.target.value)} />
          </Field>
          <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={nomesMascota}
              onChange={(e) => setNomesMascota(e.target.checked)}
            />
            Només amb mascota
          </label>
          <Button onClick={veure} disabled={loading} variant="outline">
            <Eye className="h-4 w-4" /> {loading ? 'Carregant…' : 'Veure'}
          </Button>

          <Button onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </CardBody>
      </Card>


      {rows === null ? (
        <EmptyState>Carregant…</EmptyState>
      ) : visibles.length === 0 ? (
        <EmptyState>{nomesMascota ? 'Cap registre amb mascota.' : 'Cap registre en aquest rang.'}</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Contracte</Th>
              <Th>Entrada</Th>
              <Th>Sortida</Th>
              <Th>Nom</Th>
              <Th>Cognoms</Th>
              <Th>Document</Th>
              <Th>Municipi</Th>
              <Th>Mossos</Th>
              <Th>Accions</Th>
            </tr>
          </Thead>
          <tbody>
            {paginats.map((r, i) => {
              const globalIdx = (pagina - 1) * perPagina + i;
              const isFirst = firstRowOf.get(r.estanciaId) === globalIdx;
              const gIdx = groupOf.get(r.estanciaId) ?? 0;
              const isEven = gIdx % 2 === 0;
              return (
                <Tr key={i} className={isFirst && i > 0 ? 'border-t-2 border-slate-200' : isFirst ? '' : 'border-t-0'} style={{ backgroundColor: isEven ? 'white' : '#f8f8f8' }}>
                  <Td>{r.numContracte}</Td>
                  <Td>{r.dataEntrada}</Td>
                  <Td>{r.dataSortida}</Td>
                  <Td>{r.nom}</Td>
                  <Td>
                    {r.cognom1} {r.cognom2}
                  </Td>
                  <Td>
                    {r.tipusDocument} {r.numDocument}
                  </Td>
                  <Td>{r.municipi}</Td>
                  <Td>{isFirst ? estatBadge(r.enviamentEstat) : null}</Td>
                  <Td>
                    {isFirst && (
                      <div className="flex items-center gap-1">
                        <Link href={`/estancies/${r.estanciaId}`} title="Editar">
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <EliminarEstada
                          id={r.estanciaId}
                          contracte={r.numContracte}
                          comunicada={r.enviamentEstat === 'ENVIAT' || r.enviamentEstat === 'ACCEPTAT'}
                          redirectTo={null}
                          onDeleted={() => veure()}
                          iconOnly
                        />
                      </div>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {visibles.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <span>Files per pàgina:</span>
            {PER_PAGINA_OPTS.map((o) => (
              <button key={o} type="button" onClick={() => { setPerPagina(o); setPagina(1); }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${o === perPagina ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-700'}`}>
                {o}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-brand-300">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Pàgina <strong>{pagina}</strong> de <strong>{totalPagines}</strong> <span className="text-slate-400">({visibles.length} registres)</span></span>
            <button type="button" disabled={pagina >= totalPagines} onClick={() => setPagina(p => p + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-brand-300">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
