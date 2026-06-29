'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Eye, AlertTriangle, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { GenerarFitxerButton, type FitxerNotice } from '@/components/estancia/generar-fitxer-button';
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

export default function LlibrePage() {
  const [desde, setDesde] = useState('');
  const [fins, setFins] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<FitxerNotice | null>(null);
  const [nomesMascota, setNomesMascota] = useState(false);

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
  const visibles = (rows ?? []).filter(
    (r) => !nomesMascota || (!!r.mascotes && r.mascotes.trim() !== '' && r.mascotes !== '—'),
  );
  const firstRowOf = new Map<string, number>();
  visibles.forEach((r, i) => {
    if (!firstRowOf.has(r.estanciaId)) firstRowOf.set(r.estanciaId, i);
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
          <Button onClick={veure} disabled={loading} variant="outline">
            <Eye className="h-4 w-4" /> {loading ? 'Carregant…' : 'Veure'}
          </Button>

          <Button onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </CardBody>
      </Card>

      {notice && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            notice.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-800'
          }`}
        >
          {notice.tone === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notice.msg}</span>
        </div>
      )}

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
            {visibles.map((r, i) => {
              const isFirst = firstRowOf.get(r.estanciaId) === i;
              return (
                <Tr key={i}>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/estancies/${r.estanciaId}`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="h-4 w-4" /> Editar
                          </Button>
                        </Link>
                        <GenerarFitxerButton
                          estanciaId={r.estanciaId}
                          label="Enviar a Mossos"
                          size="sm"
                          variant="outline"
                          contracteLabel={r.numContracte}
                          onResult={(n) => setNotice(n)}
                          onDone={() => veure()}
                        />
                        <EliminarEstada
                          id={r.estanciaId}
                          contracte={r.numContracte}
                          comunicada={r.enviamentEstat === 'ENVIAT' || r.enviamentEstat === 'ACCEPTAT'}
                          redirectTo={null}
                          onDeleted={() => veure()}
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
    </div>
  );
}
