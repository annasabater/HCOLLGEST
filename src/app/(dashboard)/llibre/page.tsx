'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Eye, AlertTriangle, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
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
  sexe: string;
  dataNaixement: string;
  nacionalitat: string;
  tipusDocument: string;
  numDocument: string;
  numSuport: string;
  dataExpedicio: string;
  paisEmissor: string;
  adreca: string;
  municipi: string;
  codiPostal: string;
  pais: string;
  telefon: string;
  email: string;
  numPersones: number;
  parentesc: string;
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

const MESOS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];

export default function LlibrePage() {
  const anyActual = new Date().getFullYear();
  const ANYS = [anyActual + 1, anyActual, anyActual - 1, anyActual - 2, anyActual - 3, anyActual - 4];

  const [desde, setDesde] = useState('');
  const [fins, setFins] = useState('');
  const [any, setAny] = useState('');
  const [mes, setMes] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [complet, setComplet] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [perPagina, setPerPagina] = useState(25);

  const queryDe = (d: string, f: string) => {
    const p = new URLSearchParams();
    if (d) p.set('desde', d);
    if (f) p.set('fins', f);
    return p.toString();
  };

  async function veure(d = desde, f = fins) {
    setLoading(true);
    setPagina(1);
    try {
      const res = await getJSON<{ rows: Row[] }>(`/api/llibre?${queryDe(d, f)}`);
      setRows(res.rows);
    } finally {
      setLoading(false);
    }
  }

  // Aplica un període per mes/any: calcula desde/fins i recarrega.
  function aplicarPeriode(novAny: string, novMes: string) {
    setAny(novAny);
    setMes(novMes);
    let d = '';
    let f = '';
    if (novAny) {
      const y = Number(novAny);
      if (novMes) {
        const m = Number(novMes); // 1-12
        const ultimDia = new Date(y, m, 0).getDate();
        const mm = String(m).padStart(2, '0');
        d = `${y}-${mm}-01`;
        f = `${y}-${mm}-${String(ultimDia).padStart(2, '0')}`;
      } else {
        d = `${y}-01-01`;
        f = `${y}-12-31`;
      }
    }
    setDesde(d);
    setFins(f);
    veure(d, f);
  }

  function exportXlsx() {
    const p = new URLSearchParams(queryDe(desde, fins));
    p.set('format', 'xlsx');
    window.open(`/api/llibre?${p.toString()}`, '_blank');
  }

  // Carrega TOT el llibre automàticament en obrir la pàgina (sense filtre de dates).
  // Els camps de data segueixen servint per acotar i tornar a prémer «Veure».
  useEffect(() => {
    veure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibles = rows ?? [];
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
          <Field label="Any">
            <Select value={any} onChange={(e) => aplicarPeriode(e.target.value, mes)}>
              <option value="">Tots</option>
              {ANYS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="Mes">
            <Select value={mes} onChange={(e) => aplicarPeriode(any, e.target.value)} disabled={!any}>
              <option value="">Tot l’any</option>
              {MESOS.map((nom, i) => (
                <option key={i} value={i + 1}>{nom}</option>
              ))}
            </Select>
          </Field>
          <Field label="Des de">
            <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setAny(''); setMes(''); }} />
          </Field>
          <Field label="Fins a">
            <Input type="date" value={fins} onChange={(e) => { setFins(e.target.value); setAny(''); setMes(''); }} />
          </Field>
          <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={complet}
              onChange={(e) => setComplet(e.target.checked)}
            />
            Llibre registre
          </label>
          <Button onClick={() => veure()} disabled={loading} variant="outline">
            <Eye className="h-4 w-4" /> {loading ? 'Carregant…' : 'Veure'}
          </Button>

          <Button onClick={exportXlsx}>
            <Download className="h-4 w-4" /> Exportar Excel
          </Button>
        </CardBody>
      </Card>


      {rows === null ? (
        <EmptyState>Carregant…</EmptyState>
      ) : visibles.length === 0 ? (
        <EmptyState>Cap registre en aquest període.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Entrada</Th>
              <Th>Sortida</Th>
              <Th>Nom</Th>
              <Th>Cognoms</Th>
              {complet && <Th>Sexe</Th>}
              {complet && <Th>Naixement</Th>}
              {complet && <Th>Nacionalitat</Th>}
              <Th>Document</Th>
              {complet && <Th>Núm. suport</Th>}
              {complet && <Th>Data exped.</Th>}
              {complet && <Th>Adreça</Th>}
              <Th>Municipi</Th>
              {complet && <Th>CP</Th>}
              {complet && <Th>País</Th>}
              {complet && <Th>Telèfon</Th>}
              {complet && <Th>Email</Th>}
              {complet && <Th>Persones</Th>}
              {complet && <Th>Parentesc</Th>}
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
                  <Td>{r.dataEntrada}</Td>
                  <Td>{r.dataSortida}</Td>
                  <Td>{r.nom}</Td>
                  <Td>
                    {r.cognom1} {r.cognom2}
                  </Td>
                  {complet && <Td>{r.sexe}</Td>}
                  {complet && <Td>{r.dataNaixement}</Td>}
                  {complet && <Td>{r.nacionalitat}</Td>}
                  <Td>
                    {r.tipusDocument} {r.numDocument}
                  </Td>
                  {complet && <Td>{r.numSuport}</Td>}
                  {complet && <Td>{r.dataExpedicio}</Td>}
                  {complet && <Td>{r.adreca}</Td>}
                  <Td>{r.municipi}</Td>
                  {complet && <Td>{r.codiPostal}</Td>}
                  {complet && <Td>{r.pais}</Td>}
                  {complet && <Td>{r.telefon}</Td>}
                  {complet && <Td>{r.email}</Td>}
                  {complet && <Td>{r.numPersones}</Td>}
                  {complet && <Td>{r.parentesc}</Td>}
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
